

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { generateSrtFromVideoAndLyrics, refineSrtTimings } from './services/geminiService';
import FileUpload from './components/FileUpload';
import LyricsInput from './components/LyricsInput';
import SrtDisplay from './components/SrtDisplay';
import Loader from './components/Loader';
import { SrtEntryData, msToTimestamp, timestampToMs, parseSrt, parseVtt, parseLrc, serializeSrt, srtToVtt, serializeLrc } from './utils/srtUtils';
import { ArchiveBoxIcon, ArrowPathIcon, ChevronDownIcon, DownloadIcon, EditIcon, PlayIcon, PlusIcon, RedoIcon, SparklesIcon, UndoIcon } from './components/icons';
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
    endTimePadding: number;
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
  const [endTimePadding, setEndTimePadding] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draftToRestore, setDraftToRestore] = useState<SavedDraft | null>(null);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);


  // Load draft from localStorage on initial mount
  useEffect(() => {
    try {
      const savedDraftJSON = localStorage.getItem('srtLyricSyncDraft');
      if (savedDraftJSON) {
        const savedDraft = JSON.parse(savedDraftJSON) as SavedDraft;
        if (savedDraft.entries && Array.isArray(savedDraft.entries) && savedDraft.entries.length > 0) {
          // Add default values if missing from old drafts
          if (typeof savedDraft.offset === 'undefined') {
              savedDraft.offset = 0;
          }
          if (typeof savedDraft.endTimePadding === 'undefined') {
              savedDraft.endTimePadding = 0;
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
                endTimePadding: endTimePadding,
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
  }, [srtEntries, videoFile, isLoading, isRefining, offset, endTimePadding]);


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

  // Spacebar play/pause functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Do nothing if there's no video loaded or if it's loading/refining
      if (!videoRef.current || isLoading || isRefining) {
        return;
      }
      
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable
      );

      if (event.code === 'Space' && !isTyping) {
        event.preventDefault(); // Prevent default spacebar action (like scrolling)
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoading, isRefining]);

   // Close download menu on outside click
   useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
            setIsDownloadMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [downloadMenuRef]);

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
    setEndTimePadding(0);
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
        // Reset sliders after successful refinement
        setOffset(0);
        setEndTimePadding(0);
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
  
  const handleEndTimePaddingChange = (newPadding: number) => {
    const diff = newPadding - endTimePadding;
    if (diff === 0) return;

    setSrtEntries(currentEntries => currentEntries.map((entry, index) => {
        const startTimeMs = timestampToMs(entry.startTime);
        let newEndTimeMs = timestampToMs(entry.endTime) + diff;

        // Ensure end time doesn't precede start time.
        newEndTimeMs = Math.max(startTimeMs, newEndTimeMs);

        // If padding is being added, prevent overlap with the next subtitle.
        const isIncreasingPadding = diff > 0;
        const hasNextEntry = index < currentEntries.length - 1;

        if (isIncreasingPadding && hasNextEntry) {
          const nextEntryStartTimeMs = timestampToMs(currentEntries[index + 1].startTime);
          // Cap the end time at the start of the next entry.
          newEndTimeMs = Math.min(newEndTimeMs, nextEntryStartTimeMs);
        }

        return {
            ...entry,
            endTime: msToTimestamp(newEndTimeMs),
        };
    }));
    setEndTimePadding(newPadding);
  };

  const handleSetTimeToCurrent = (entryIndex: number, field: 'startTime' | 'endTime') => {
    if (!videoRef.current) return;
    const currentTimeMs = videoRef.current.currentTime * 1000;
    
    setSrtEntries(currentEntries => {
        const entryArrayIndex = currentEntries.findIndex(e => e.index === entryIndex);
        if (entryArrayIndex === -1) {
            return currentEntries;
        }

        const newEntries = [...currentEntries]; // Create a mutable copy
        const entryToUpdate = newEntries[entryArrayIndex];

        if (field === 'startTime') {
            const durationMs = Math.max(0, timestampToMs(entryToUpdate.endTime) - timestampToMs(entryToUpdate.startTime));
            let newStartTimeMs = currentTimeMs;

            // Constraint 1: Prevent overlap with the previous entry.
            if (entryArrayIndex > 0) {
                const prevEntryEndTimeMs = timestampToMs(newEntries[entryArrayIndex - 1].endTime);
                newStartTimeMs = Math.max(newStartTimeMs, prevEntryEndTimeMs);
            }

            let newEndTimeMs = newStartTimeMs + durationMs;

            // Constraint 2: Prevent overlap with the next entry. Shorten duration if necessary.
            if (entryArrayIndex < newEntries.length - 1) {
                const nextEntryStartTimeMs = timestampToMs(newEntries[entryArrayIndex + 1].startTime);
                newEndTimeMs = Math.min(newEndTimeMs, nextEntryStartTimeMs);
                // Ensure start time is not after the (potentially capped) end time.
                if (newStartTimeMs > newEndTimeMs) {
                    newStartTimeMs = newEndTimeMs;
                }
            }
            
            newEntries[entryArrayIndex] = {
                ...entryToUpdate,
                startTime: msToTimestamp(newStartTimeMs),
                endTime: msToTimestamp(newEndTimeMs),
            };

        } else { // field === 'endTime'
            let newEndTimeMs = currentTimeMs;

            // Constraint 1: End time must not be before start time.
            const currentStartTimeMs = timestampToMs(entryToUpdate.startTime);
            newEndTimeMs = Math.max(newEndTimeMs, currentStartTimeMs);

            // Constraint 2: Prevent overlap with the next entry.
            if (entryArrayIndex < newEntries.length - 1) {
                const nextEntryStartTimeMs = timestampToMs(newEntries[entryArrayIndex + 1].startTime);
                newEndTimeMs = Math.min(newEndTimeMs, nextEntryStartTimeMs);
            }

            newEntries[entryArrayIndex] = {
                ...entryToUpdate,
                endTime: msToTimestamp(newEndTimeMs),
            };
        }

        return newEntries; // Return the modified array
    });
  };

  const handleEntryClick = (entry: SrtEntryData) => {
    if (videoRef.current) {
        // Seek the video to the start time of the clicked entry
        videoRef.current.currentTime = timestampToMs(entry.startTime) / 1000;
    }
    // Set the clicked entry as the active one for editing
    setActiveIndex(entry.index);
  };

  const handleRestoreDraft = () => {
    if (draftToRestore) {
        resetSrtEntries(draftToRestore.entries);
        setOffset(draftToRestore.offset || 0);
        setEndTimePadding(draftToRestore.endTimePadding || 0);
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

  const handleImportSubtitles = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
            setError('File is empty or could not be read.');
            return;
        }

        try {
            let parsedEntries: SrtEntryData[] = [];
            const extension = file.name.split('.').pop()?.toLowerCase();
            
            switch (extension) {
                case 'srt':
                    parsedEntries = parseSrt(content);
                    break;
                case 'vtt':
                    parsedEntries = parseVtt(content);
                    break;
                case 'lrc':
                    parsedEntries = parseLrc(content);
                    break;
                default:
                    setError(`Unsupported file type: .${extension}`);
                    return;
            }

            if (parsedEntries.length === 0) {
                setError('No valid subtitle entries found in the file.');
                return;
            }

            setError(null);
            setLyrics(''); // Clear lyrics input
            resetSrtEntries(parsedEntries);
            setOffset(0);
            setEndTimePadding(0);

        } catch (err) {
            console.error('Error parsing subtitle file:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to parse file: ${errorMessage}`);
        }
    };
    reader.onerror = () => {
        setError('Error reading the file.');
    };
    reader.readAsText(file);
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = (format: 'srt' | 'vtt' | 'lrc') => {
    const getBaseName = () => videoFile?.name.substring(0, videoFile.name.lastIndexOf('.')) || 'lyrics';
    const baseName = getBaseName();
    let content = '';
    let fileName = '';
    let mimeType = 'text/plain';

    switch (format) {
      case 'srt':
        content = serializeSrt(srtEntries);
        fileName = `${baseName}.srt`;
        break;
      case 'vtt':
        content = srtToVtt(serializeSrt(srtEntries));
        fileName = `${baseName}.vtt`;
        mimeType = 'text/vtt';
        break;
      case 'lrc':
        content = serializeLrc(srtEntries);
        fileName = `${baseName}.lrc`;
        break;
    }
    
    downloadFile(content, fileName, mimeType);
    setIsDownloadMenuOpen(false);
  };


  const canGenerate = videoFile !== null && lyrics.trim().length > 0 && !isLoading && !isRefining;

  const isAudio = videoFile?.type.startsWith('audio/');
  const uploadBoxTitle = videoFile 
    ? (isAudio ? '1. Preview Audio' : '1. Preview Video')
    : '1. Upload Video or Audio';

  const containerClasses = 'bg-gray-900 text-white font-sans flex flex-col min-h-screen lg:h-screen lg:overflow-hidden';
  const allControlsDisabled = isRefining || isLoading;

  return (
    <div className={containerClasses}>
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
            <header className="text-center my-3 flex-shrink-0">
                <h1 className="text-lg md:text-xl font-semibold tracking-tight text-gray-300 flex flex-wrap justify-center items-center gap-x-2 px-2">
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
                        SRT Lyric Sync
                    </span>
                    <span className="text-xs md:text-sm text-gray-400 font-normal">
                        Automatically generate synchronized subtitles for your music videos.
                    </span>
                </h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch flex-grow min-h-0">
            {/* Input Column (2/5 width on large screens) */}
            <div className="lg:col-span-2 flex flex-col gap-6 min-h-0">
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
                        <div className="flex items-center gap-2">
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
                    </div>
                    <LyricsInput 
                        lyrics={lyrics} 
                        setLyrics={setLyrics} 
                        disabled={isLoading || isRefining}
                        onImport={handleImportSubtitles}
                    />
                </div>
            </div>

            {/* Output Column (3/5 width on large screens) */}
            <div className="lg:col-span-3 p-5 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 flex flex-col gap-4 min-h-0 h-screen lg:h-auto">
                <h2 className="text-lg font-semibold text-gray-200">3. Edit Your Subtitles</h2>
                
                {/* Content Area for Column */}
                <div className="bg-gray-900/70 rounded-lg relative flex flex-col flex-grow min-h-0">
                    {isLoading && <Loader message={loadingMessage} />}
                    {!isLoading && error && (
                        <div className="flex items-center justify-center h-full text-center text-red-400 p-4">
                        <p>{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && srtEntries.length > 0 && videoFile && videoUrl ? (
                         <div className="flex flex-col flex-grow min-h-0">
                            {/* Video Player Area */}
                            <div className="relative bg-black flex-shrink-0 border-b-2 border-gray-700/50 max-h-[35vh] p-2">
                                <VideoPreview 
                                    ref={videoRef}
                                    videoFile={videoFile} 
                                    videoUrl={videoUrl} 
                                    entries={srtEntries} 
                                    onTimeUpdate={setCurrentTime}
                                />
                            </div>
                            {/* Controls Bar */}
                             <div className="p-3 border-b border-gray-700 flex justify-between items-center flex-wrap gap-2 flex-shrink-0">
                                {/* Left side: History */}
                                <div className="flex items-center space-x-2">
                                    <button onClick={undo} disabled={!canUndo || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Undo">
                                        <UndoIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={redo} disabled={!canRedo || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Redo">
                                        <RedoIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Right side: Actions */}
                                <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
                                    <button onClick={handleAddLine} disabled={allControlsDisabled} className="flex items-center p-2 sm:px-3 sm:py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Add new subtitle line to the end">
                                        <PlusIcon className="w-5 h-5 sm:mr-2" />
                                        <span className="hidden sm:inline">Add Line</span>
                                    </button>

                                    <button onClick={handleRefineTimings} disabled={allControlsDisabled} className="flex items-center p-2 sm:px-3 sm:py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Use AI to improve timing accuracy">
                                        <SparklesIcon className="w-5 h-5 sm:mr-2" />
                                        <span className="hidden sm:inline">Refine</span>
                                    </button>
                                    
                                    {/* Download Split Button */}
                                    <div className="relative inline-flex shadow-md" ref={downloadMenuRef}>
                                        <button onClick={() => handleDownload('srt')} disabled={allControlsDisabled} className="flex items-center p-2 sm:px-3 sm:py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-l-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Download SRT file">
                                            <DownloadIcon className="w-5 h-5 sm:mr-2" />
                                            <span className="hidden sm:inline">Download SRT</span>
                                        </button>
                                        <button onClick={() => setIsDownloadMenuOpen(prev => !prev)} disabled={allControlsDisabled} className="p-2 sm:px-1.5 bg-teal-600 hover:bg-teal-500 rounded-r-md border-l border-teal-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="More download options">
                                            <ChevronDownIcon className="w-5 h-5" />
                                        </button>

                                        {isDownloadMenuOpen && (
                                            <div className="absolute right-0 bottom-full mb-2 w-40 bg-gray-700 rounded-md shadow-lg z-10 border border-gray-600 overflow-hidden">
                                                <a onClick={() => handleDownload('vtt')} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 cursor-pointer">Download VTT</a>
                                                <a onClick={() => handleDownload('lrc')} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 cursor-pointer">Download LRC</a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Timing Controls */}
                             <div className={`p-3 bg-gray-900/50 border-b border-gray-700 transition-all space-y-4 flex-shrink-0 ${allControlsDisabled ? 'filter blur-sm pointer-events-none' : ''}`}>
                                {/* Global Offset */}
                                <div>
                                    <label htmlFor="timing-offset-slider" className="block text-sm font-medium text-gray-300 mb-2">Global Timing Offset</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="timing-offset-slider"
                                            type="range"
                                            min="-5000"
                                            max="5000"
                                            step="10"
                                            value={offset}
                                            onChange={(e) => handleOffsetChange(parseInt(e.target.value, 10))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                            disabled={allControlsDisabled}
                                            title={`${offset}ms`}
                                        />
                                        <input
                                            type="number"
                                            min="-5000"
                                            max="5000"
                                            value={offset}
                                            onChange={(e) => handleOffsetChange(parseInt(e.target.value, 10) || 0)}
                                            className="w-24 bg-gray-700 text-center p-1 rounded border border-gray-600 disabled:opacity-50"
                                            step="10"
                                            aria-label="Timing offset in milliseconds"
                                            disabled={allControlsDisabled}
                                        />
                                        <button onClick={() => handleOffsetChange(0)} disabled={offset === 0 || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Reset offset">
                                            <ArrowPathIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                {/* End Time Padding */}
                                <div>
                                    <label htmlFor="end-time-padding-slider" className="block text-sm font-medium text-gray-300 mb-2" title="Adds a small delay to the end of each subtitle to account for vocal decay.">
                                      Vocal Decay Helper (End Time Padding)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="end-time-padding-slider"
                                            type="range"
                                            min="-5000"
                                            max="5000"
                                            step="10"
                                            value={endTimePadding}
                                            onChange={(e) => handleEndTimePaddingChange(parseInt(e.target.value, 10))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                            disabled={allControlsDisabled}
                                            title={`${endTimePadding >= 0 ? '+' : ''}${endTimePadding}ms`}
                                        />
                                        <input
                                            type="number"
                                            value={endTimePadding}
                                            onChange={(e) => handleEndTimePaddingChange(parseInt(e.target.value, 10) || 0)}
                                            className="w-24 bg-gray-700 text-center p-1 rounded border border-gray-600 disabled:opacity-50"
                                            step="10"
                                            min="-5000"
                                            max="5000"
                                            aria-label="End time padding in milliseconds"
                                            disabled={allControlsDisabled}
                                        />
                                        <button onClick={() => handleEndTimePaddingChange(0)} disabled={endTimePadding === 0 || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Reset padding">
                                            <ArrowPathIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {/* SRT Editor Area */}
                            <div className="flex-grow min-h-0 flex flex-col">
                                <SrtDisplay 
                                    entries={srtEntries}
                                    setEntries={setSrtEntries}
                                    isRefining={isRefining}
                                    onSetTimeToCurrent={handleSetTimeToCurrent}
                                    currentTime={currentTime}
                                    onEntryClick={handleEntryClick}
                                    activeIndex={activeIndex}
                                    setActiveIndex={setActiveIndex}
                                />
                            </div>
                        </div>
                    ) : (
                         !isLoading && !error && srtEntries.length === 0 && (
                            <div className="flex items-center justify-center h-full text-center text-gray-500 p-4">
                                <p>Your generated SRT file will appear here.</p>
                            </div>
                        )
                    )}

                    { !isLoading && !error && srtEntries.length > 0 && !videoFile && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-4">
                            <p className="font-semibold text-lg">Media File Missing</p>
                            <p className="mt-2 text-gray-300">Please re-upload the original media file to edit and preview the subtitles.</p>
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