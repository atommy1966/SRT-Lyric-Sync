
import React from 'react';

interface LyricsInputProps {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  disabled: boolean;
}

const LyricsInput: React.FC<LyricsInputProps> = ({ lyrics, setLyrics, disabled }) => {
  return (
    <div className="flex flex-col h-full">
      <label htmlFor="lyrics" className="text-lg font-semibold mb-2 text-gray-300">
        Paste Lyrics
      </label>
      <textarea
        id="lyrics"
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        disabled={disabled}
        placeholder="Paste the full song lyrics here, one line per subtitle entry..."
        className="w-full flex-grow p-4 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default LyricsInput;
