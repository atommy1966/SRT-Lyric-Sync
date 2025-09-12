
import React, { useRef } from 'react';
import { UploadIcon, XIcon } from './icons';

interface LyricsInputProps {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  disabled: boolean;
  onImport: (file: File) => void;
}

const LyricsInput: React.FC<LyricsInputProps> = ({ lyrics, setLyrics, disabled, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
          <button
              onClick={handleImportClick}
              disabled={disabled}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-dashed border-gray-600 hover:border-teal-500 hover:text-teal-400 text-gray-400 transition-colors duration-200
                        disabled:bg-gray-700 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
              <UploadIcon className="w-5 h-5" />
              Import File (.srt, .vtt, .lrc)
          </button>
          <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".srt,.vtt,.lrc"
              className="hidden"
              disabled={disabled}
          />
      </div>

       <div className="relative flex items-center mb-3">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-xs">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>

      <div className="relative flex-grow">
        <textarea
          id="lyrics"
          aria-label="Paste Lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          disabled={disabled}
          placeholder="Paste the full song lyrics here..."
          className="w-full h-full p-4 pr-10 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {lyrics.length > 0 && !disabled && (
            <button
                onClick={() => setLyrics('')}
                className="absolute top-2.5 right-2.5 p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                aria-label="Clear lyrics"
                title="Clear lyrics"
            >
                <XIcon className="w-5 h-5" />
            </button>
        )}
      </div>
    </div>
  );
};

export default LyricsInput;