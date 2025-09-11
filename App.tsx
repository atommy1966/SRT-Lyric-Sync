

import React, { useState, useCallback, useEffect } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { generateSrtFromVideoAndLyrics, refineSrtTimings } from './services/geminiService';
import FileUpload from './components/FileUpload';
import LyricsInput from './components/LyricsInput';
import SrtDisplay from './components/SrtDisplay';
import Loader from './components/Loader';
import { SrtEntryData, msToTimestamp, timestampToMs } from './utils/srtUtils';
import { ArchiveBoxIcon, ArrowPathIcon, DownloadIcon, EditIcon, PlayIcon, PlusIcon, RedoIcon, SparklesIcon, UndoIcon } from './components/icons';
import VideoPreview from './components/VideoPreview';
import DownloadDialog from './components/DownloadDialog';

// Custom hook to manage state with undo/redo functionality
const useHistoryState = <T,>(initialState: T) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const state = history[currentIndex];

    const setState = useCallback((newState: T | ((prevState: T) => T)) => {
        const nextState = typeof newState === 'function' 
            ? (newState as (prevState: T) => T)(state) 
            : newState;

        if (JSON.stringify(nextState) === JSON.stringify(state)) {
            return; // Don't add a new state if it's identical to the current one
        }

        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(nextState);
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
    }, [history, currentIndex, state]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    }, [currentIndex, history.length]);

    const resetState = useCallback((newState: T) => {
        setHistory([newState]);
        setCurrentIndex(0);
    }, []);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    return { state, setState, undo, redo, canUndo, canRedo, resetState };
};

interface SavedDraft {
    entries: SrtEntryData[];
    videoFileName: string | null;
    timestamp: string;
    offset: number;
}

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;


const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string>('');
  const { 
    state: srtEntries, 
    setState: setSrtEntries, 
    resetState: resetSrtEntries,
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistoryState<SrtEntryData[]>([]);

  const [offset, setOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const [draftToRestore, setDraftToRestore] = useState<SavedDraft | null>(null);

  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

  // Load draft from localStorage on initial mount
  useEffect(() => {
    try {
      const savedDraftJSON = localStorage.getItem('srtLyricSyncDraft');
      if (savedDraftJSON) {
        const savedDraft = JSON.parse(savedDraftJSON) as SavedDraft;
        if (savedDraft.entries && Array.isArray(savedDraft.entries) && savedDraft.entries.length > 0) {
          // Add default offset if missing from old drafts
          if (typeof savedDraft.offset === 'undefined') {
              savedDraft.offset = 0;
          }
          setDraftToRestore(savedDraft);
        }
      }
    } catch (e) {
      console.error("Failed to load or parse draft from localStorage", e);
      localStorage.removeItem('srtLyricSyncDraft'); // Clear corrupted data
    }
  }, []);

  // Auto-save SRT entries to localStorage with debouncing
  useEffect(() => {
    if (isLoading || isRefining) return; // Don't save while a generation or refinement is in progress

    const handler = setTimeout(() => {
        if (srtEntries.length > 0) {
            const draft: SavedDraft = {
                entries: srtEntries,
                videoFileName: videoFile?.name || null,
                // FIX: Corrected typo in Date constructor
                timestamp: new Date().toISOString(),
                offset: offset,
            };
            localStorage.setItem('srtLyricSyncDraft', JSON.stringify(draft));
        } else {
            // If entries are cleared, remove the draft from storage
            localStorage.removeItem('srtLyricSyncDraft');
        }
    }, 1500); // Debounce for 1.5 seconds

    return () => {
        clearTimeout(handler);
    };
  }, [srtEntries, videoFile, isLoading, isRefining, offset]);


  useEffect(() => {
    if (!videoFile) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(videoFile);
    setVideoUrl(objectUrl);

    // Cleanup the object URL when the component unmounts or the file changes
    return () => URL.revokeObjectURL(objectUrl);
  }, [videoFile]);

  const handleFileSelect = (file: File | null) => {
    // If null, it's a removal, just proceed
    if (!file) {
        setVideoFile(null);
        return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File is too large. Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`);
        setVideoFile(null); // Clear any existing file
        return;
    }
    setError(null); // Clear previous errors
    setVideoFile(file);
  };

  const handleGenerate = useCallback(async () => {
    if (!videoFile || !lyrics) {
      setError("Please provide both a media file and the lyrics.");
      return;
    }

    setIsLoading(true);
    setError(null);
    resetSrtEntries([]);
    setOffset(0);
    setView('editor');
    // The old draft will be overwritten by the auto-save effect upon successful generation.

    try {
      setLoadingMessage("Step 1/2: Analyzing audio & syncing lyrics...");
      const videoBase64 = await fileToBase64(videoFile);
      const initialSrtData = await generateSrtFromVideoAndLyrics(videoBase64, videoFile.type, lyrics);
      
      // Automatically refine the results for better accuracy
      setLoadingMessage("Step 2/2: Refining timings for accuracy...");
      const refinedSrtData = await refineSrtTimings(videoBase64, videoFile.type, initialSrtData);

      resetSrtEntries(refinedSrtData);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(`Failed to process: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [videoFile, lyrics, resetSrtEntries]);
  
  const handleRefineTimings = useCallback(async () => {
    if (!videoFile) {
        setError("Please upload the media file to use the refine feature.");
        return;
    }
    if (srtEntries.length === 0) {
        setError("There are no subtitles to refine.");
        return;
    }

    setIsRefining(true);
    setError(null);

    try {
        const videoBase64 = await fileToBase64(videoFile);
        const refinedSrtData = await refineSrtTimings(videoBase64, videoFile.type, srtEntries);
        setSrtEntries(refinedSrtData);
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
        setError(`Failed to refine timings: ${errorMessage}`);
    } finally {
        setIsRefining(false);
    }
  }, [videoFile, srtEntries, setSrtEntries]);

  const handleAddLine = () => {
    setSrtEntries(currentEntries => {
        const newIndex = currentEntries.length + 1;
        const lastEntry = currentEntries[currentEntries.length - 1];
        const newEntry: SrtEntryData = {
        index: newIndex,
        startTime: lastEntry?.endTime || '00:00:00,000',
        endTime: lastEntry?.endTime || '00:00:00,000',
        text: 'New subtitle'
        };
        return [...currentEntries, newEntry];
    });
  };

  const handleOffsetChange = (newOffsetValue: number) => {
    const diff = newOffsetValue - offset;
    if (diff === 0) return;

    setSrtEntries(currentEntries => currentEntries.map(entry => {
        const newStartTime = timestampToMs(entry.startTime) + diff;
        const newEndTime = timestampToMs(entry.endTime) + diff;
        return {
            ...entry,
            startTime: msToTimestamp(newStartTime),
            endTime: msToTimestamp(newEndTime),
        };
    }));
    setOffset(newOffsetValue);
  };

  const handleRestoreDraft = () => {
    if (draftToRestore) {
        resetSrtEntries(draftToRestore.entries);
        setOffset(draftToRestore.offset || 0);
        setError("Draft restored. Please re-upload the original media file to use the preview and refine functions.");
        // Clear the info message after a few seconds
        setTimeout(() => setError(null), 6000);
    }
    setDraftToRestore(null); // Hide the restore prompt
  };

  const handleDismissDraft = () => {
    localStorage.removeItem('srtLyricSyncDraft');
    setDraftToRestore(null);
  };


  const canGenerate = videoFile !== null && lyrics.trim().length > 0 && !isLoading && !isRefining;

  const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const isAudio = videoFile?.type.startsWith('audio/');
  const uploadBoxTitle = videoFile 
    ? (isAudio ? '1. Preview Audio' : '1. Preview Video')
    : '1. Upload Video or Audio';

  const containerClasses = 'bg-gray-900 text-white font-sans flex flex-col min-h-screen lg:h-screen lg:overflow-hidden';
  const allControlsDisabled = isRefining || isLoading;

  return (
    <div className={containerClasses}>
        <DownloadDialog 
            isOpen={isDownloadDialogOpen}
            onClose={() => setIsDownloadDialogOpen(false)}
            entries={srtEntries}
            videoFileName={videoFile?.name ?? 'lyrics.srt'}
        />
        {draftToRestore && (
            <div className="bg-gray-800 border-b border-teal-800 text-center p-3 flex justify-center items-center gap-4 text-sm shadow-lg flex-shrink-0">
                <ArchiveBoxIcon className="w-6 h-6 text-teal-400 flex-shrink-0" />
                <p className="text-gray-300">
                    Found an unsaved draft
                    {draftToRestore.videoFileName && <span className="font-semibold text-white"> for "{draftToRestore.videoFileName}"</span>}.
                    Would you like to restore it?
                </p>
                <button 
                    onClick={handleRestoreDraft}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 rounded-md font-semibold transition-colors"
                >
                    Restore
                </button>
                <button 
                    onClick={handleDismissDraft}
                    className="px-4 py-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
                >
                    Dismiss
                </button>
            </div>
        )}
        <main className="max-w-7xl mx-auto w-full flex flex-col flex-grow p-4 min-h-0">
            <header className="text-center mb-6 flex-shrink-0">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
                SRT Lyric Sync
            </h1>
            <p className="mt-2 max-w-2xl mx-auto text-base text-gray-400">
                Automatically generate synchronized subtitles for your music videos.
            </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-grow min-h-0">
            {/* Input Column */}
            <div className="flex flex-col gap-6 min-h-0">
                <div className="p-5 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 flex flex-col min-h-0">
                  <div className="flex items-baseline mb-4">
                    <h2 className="text-lg font-semibold text-gray-200 flex-shrink-0">
                      {uploadBoxTitle}
                    </h2>
                    {videoFile && (
                      <span className="text-sm text-gray-400 truncate ml-4" title={videoFile.name}>
                          {videoFile.name}
                      </span>
                    )}
                  </div>
                  <FileUpload 
                      videoFile={videoFile} 
                      setVideoFile={handleFileSelect} 
                      disabled={isLoading || isRefining}
                      videoUrl={videoUrl}
                  />
                </div>

                <div className="p-5 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 flex flex-col flex-grow min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-200">2. Provide Lyrics</h2>
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out
                                        bg-teal-600 hover:bg-teal-500
                                        disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
                                        focus:outline-none focus:ring-4 focus:ring-teal-500/50 transform hover:scale-105 disabled:transform-none"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                    <LyricsInput lyrics={lyrics} setLyrics={setLyrics} disabled={isLoading || isRefining} />
                </div>
            </div>

            {/* Output Column */}
            <div className="p-5 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 flex flex-col gap-4 min-h-0">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-200">3. Get Your Subtitles</h2>
                    {srtEntries.length > 0 && !isLoading && !error && (
                        <nav className="flex space-x-2 p-1 bg-gray-900 rounded-lg" aria-label="Tabs">
                            <TabButton 
                                label="Editor"
                                icon={<EditIcon className="w-5 h-5" />}
                                isActive={view === 'editor'}
                                onClick={() => setView('editor')}
                            />
                            <TabButton 
                                label="Preview"
                                icon={<PlayIcon className="w-5 h-5" />}
                                isActive={view === 'preview'}
                                onClick={() => setView('preview')}
                            />
                        </nav>
                    )}
                </div>

                {/* Controls Bar - only for editor view and when there are entries */}
                {srtEntries.length > 0 && !isLoading && !error && view === 'editor' && (
                    <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center flex-wrap gap-2">
                        {/* Left side: History */}
                        <div className="flex items-center space-x-2">
                            <button onClick={undo} disabled={!canUndo || isRefining} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Undo">
                                <UndoIcon className="w-5 h-5" />
                            </button>
                            <button onClick={redo} disabled={!canRedo || isRefining} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Redo">
                                <RedoIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Right side: Actions */}
                        <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
                            <button onClick={handleAddLine} disabled={isRefining} className="flex items-center px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Add new subtitle line to the end">
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Add Line
                            </button>

                            <button onClick={handleRefineTimings} disabled={isRefining} className="flex items-center px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Use AI to improve timing accuracy">
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                Refine
                            </button>
                            <button onClick={() => setIsDownloadDialogOpen(true)} disabled={isRefining} className="flex items-center px-3 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Download subtitle file">
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                Download
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Content Area for Column */}
                <div className="bg-gray-900/70 rounded-lg relative flex flex-col flex-grow min-h-0">
                    {isLoading && <Loader message={loadingMessage} />}
                    {!isLoading && error && (
                        <div className="flex items-center justify-center h-full text-center text-red-400 p-4">
                        <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && srtEntries.length > 0 && (
                        view === 'editor' ? (
                            <>
                                <div className={`p-3 bg-gray-900/50 border-b border-gray-700 transition-all ${allControlsDisabled ? 'filter blur-sm pointer-events-none' : ''}`}>
                                    <div>
                                        <label htmlFor="timing-offset-slider" className="block text-sm font-medium text-gray-300 mb-2">Global Timing Offset</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                id="timing-offset-slider"
                                                type="range"
                                                min="-5000"
                                                max="5000"
                                                step="1"
                                                value={offset}
                                                onChange={(e) => handleOffsetChange(parseInt(e.target.value, 10))}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                                disabled={allControlsDisabled}
                                                title={`${offset}ms`}
                                            />
                                            <input
                                                type="number"
                                                value={offset}
                                                onChange={(e) => handleOffsetChange(parseInt(e.target.value, 10) || 0)}
                                                className="w-24 bg-gray-700 text-center p-1 rounded border border-gray-600 disabled:opacity-50"
                                                step="1"
                                                aria-label="Timing offset in milliseconds"
                                                disabled={allControlsDisabled}
                                            />
                                            <button onClick={() => handleOffsetChange(0)} disabled={offset === 0 || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Reset offset">
                                                <ArrowPathIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <SrtDisplay 
                                    entries={srtEntries}
                                    setEntries={setSrtEntries}
                                    isRefining={isRefining}
                                />
                            </>
                        ) : (
                            <VideoPreview 
                                videoFile={videoFile!} 
                                videoUrl={videoUrl!} 
                                entries={srtEntries} 
                            />
                        )
                    )}
                    {!isLoading && !error && srtEntries.length === 0 && (
                        <div className="flex items-center justify-center h-full text-center text-gray-500 p-4">
                        <p>Your generated SRT file will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </main>
      <footer className="text-center py-4 text-gray-500 text-sm flex-shrink-0">
          <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;