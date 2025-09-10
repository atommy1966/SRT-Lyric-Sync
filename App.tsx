import React, { useState, useCallback, useEffect } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { generateSrtFromVideoAndLyrics, refineSrtTimings } from './services/geminiService';
import FileUpload from './components/FileUpload';
import LyricsInput from './components/LyricsInput';
import SrtDisplay from './components/SrtDisplay';
import Loader from './components/Loader';
import { SrtEntryData } from './utils/srtUtils';
import { ArchiveBoxIcon, EditIcon, PlayIcon } from './components/icons';
import VideoPreview from './components/VideoPreview';

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
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const [draftToRestore, setDraftToRestore] = useState<SavedDraft | null>(null);

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

  const handleGenerate = useCallback(async () => {
    if (!videoFile || !lyrics) {
      setError("Please provide both a video file and the lyrics.");
      return;
    }

    setIsLoading(true);
    setError(null);
    resetSrtEntries([]);
    setOffset(0);
    setView('editor');
    // The old draft will be overwritten by the auto-save effect upon successful generation.

    try {
      const videoBase64 = await fileToBase64(videoFile);
      const srtData = await generateSrtFromVideoAndLyrics(videoBase64, videoFile.type, lyrics);
      resetSrtEntries(srtData);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(`Failed to process: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, lyrics, resetSrtEntries]);
  
  const handleRefineTimings = useCallback(async () => {
    if (!videoFile) {
        setError("Please upload the video file to use the refine feature.");
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


  const handleRestoreDraft = () => {
    if (draftToRestore) {
        resetSrtEntries(draftToRestore.entries);
        setOffset(draftToRestore.offset || 0);
        setError("Draft restored. Please re-upload the video to use the preview and refine functions.");
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
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
        isActive
          ? 'border-teal-400 text-teal-300'
          : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
        {draftToRestore && (
            <div className="bg-gray-800 border-b border-teal-800 text-center p-3 flex justify-center items-center gap-4 text-sm shadow-lg">
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
      <div className="p-4 sm:p-6 lg:p-8">
        <main className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
                SRT Lyric Sync
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-400">
                Automatically generate synchronized subtitles for your music videos.
            </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Column */}
            <div className="flex flex-col gap-8">
                <div className="p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-200">
                    {videoFile ? '1. Preview Video' : '1. Upload Video'}
                </h2>
                <FileUpload 
                    videoFile={videoFile} 
                    setVideoFile={setVideoFile} 
                    disabled={isLoading || isRefining}
                    videoUrl={videoUrl}
                />
                </div>

                <div className="p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 h-96 flex flex-col">
                <h2 className="text-xl font-semibold mb-4 text-gray-200">2. Provide Lyrics</h2>
                <LyricsInput lyrics={lyrics} setLyrics={setLyrics} disabled={isLoading || isRefining} />
                </div>

                <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full py-4 px-6 text-lg font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out
                            bg-teal-600 hover:bg-teal-500
                            disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
                            focus:outline-none focus:ring-4 focus:ring-teal-500/50 transform hover:scale-105 disabled:transform-none"
                >
                {isLoading ? 'Generating...' : (isRefining ? 'Refining...' : 'Generate SRT')}
                </button>
            </div>

            {/* Output Column */}
            <div className="p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 min-h-[40rem] flex flex-col">
                <h2 className="text-xl font-semibold mb-4 text-gray-200">3. Get Your Subtitles</h2>
                
                {srtEntries.length > 0 && !isLoading && !error && (
                <div className="mb-4 border-b border-gray-700">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
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
                </div>
                )}
                
                <div className="flex-grow bg-gray-900/70 rounded-lg relative">
                {isLoading && <Loader message="Analyzing audio & syncing lyrics..." />}
                {!isLoading && error && (
                    <div className="flex items-center justify-center h-full text-center text-red-400 p-4">
                    <p>{error}</p>
                    </div>
                )}
                {!isLoading && !error && srtEntries.length > 0 && (
                    view === 'editor' ? (
                        <SrtDisplay 
                        entries={srtEntries}
                        setEntries={setSrtEntries}
                        videoFileName={videoFile?.name ?? 'lyrics.srt'}
                        undo={undo}
                        redo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onRefine={handleRefineTimings}
                        isRefining={isRefining}
                        offset={offset}
                        setOffset={setOffset}
                        />
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
        <footer className="text-center mt-12 text-gray-500 text-sm">
            <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;