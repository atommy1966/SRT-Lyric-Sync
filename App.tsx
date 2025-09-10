import React, { useState, useCallback, useEffect } from 'react';
import { fileToBase64 } from './utils/fileUtils';
import { generateSrtFromVideoAndLyrics } from './services/geminiService';
import FileUpload from './components/FileUpload';
import LyricsInput from './components/LyricsInput';
import SrtDisplay from './components/SrtDisplay';
import Loader from './components/Loader';
import { SrtEntryData } from './utils/srtUtils';
import { EditIcon, PlayIcon } from './components/icons';
import VideoPreview from './components/VideoPreview';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string>('');
  const [srtEntries, setSrtEntries] = useState<SrtEntryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'editor' | 'preview'>('editor');

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
    setSrtEntries([]);
    setView('editor');

    try {
      const videoBase64 = await fileToBase64(videoFile);
      const srtData = await generateSrtFromVideoAndLyrics(videoBase64, videoFile.type, lyrics);
      setSrtEntries(srtData);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(`Failed to process: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, lyrics]);

  const canGenerate = videoFile !== null && lyrics.trim().length > 0 && !isLoading;

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
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
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
                disabled={isLoading}
                videoUrl={videoUrl}
              />
            </div>

            <div className="p-6 bg-gray-800/50 rounded-xl shadow-lg border border-gray-700 h-96 flex flex-col">
              <h2 className="text-xl font-semibold mb-4 text-gray-200">2. Provide Lyrics</h2>
              <LyricsInput lyrics={lyrics} setLyrics={setLyrics} disabled={isLoading} />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-4 px-6 text-lg font-semibold rounded-lg shadow-md transition-all duration-300 ease-in-out
                         bg-teal-600 hover:bg-teal-500
                         disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-4 focus:ring-teal-500/50 transform hover:scale-105 disabled:transform-none"
            >
              {isLoading ? 'Generating...' : 'Generate SRT'}
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
  );
};

export default App;
