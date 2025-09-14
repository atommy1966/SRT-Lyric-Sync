import React, { useRef, useState } from 'react';
import { XIcon, CopyIcon, CheckIcon, ClipboardPasteIcon } from './icons';

interface LyricsInputProps {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  disabled: boolean;
}

const LyricsInput: React.FC<LyricsInputProps> = ({ lyrics, setLyrics, disabled }) => {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = () => {
    if (lyrics) {
        navigator.clipboard.writeText(lyrics).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy lyrics. Please try again.');
        });
    }
  };

  const handlePaste = async () => {
    if (disabled) return;

    // Focus the text area first. This can sometimes help the browser
    // understand that the user is interacting with this specific input area,
    // which can be a prerequisite for allowing clipboard access.
    textareaRef.current?.focus();

    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            setLyrics(text);
        }
    } catch (err) {
        console.error('Failed to paste from clipboard:', err);
        // If the paste fails, provide a clear, educational message to the user.
        // This explains *why* it failed and gives them the universally-supported alternative.
        alert(
            "Pasting with the button was blocked by your browser.\n\n" +
            "This is a common security measure in modern web browsers, especially in secure environments.\n\n" +
            "Please paste directly into the text area using your keyboard (Ctrl+V or Cmd+V)."
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-grow">
        <textarea
          ref={textareaRef}
          id="lyrics"
          aria-label="Paste Lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          disabled={disabled}
          placeholder="Paste lyrics here, or upload a media file and click 'Transcribe'..."
          className="w-full h-full p-4 pr-16 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
            {lyrics.length === 0 && !disabled && (
                 <button
                    onClick={handlePaste}
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                    aria-label="Paste lyrics"
                    title="Paste from clipboard"
                >
                    <ClipboardPasteIcon className="w-5 h-5" />
                </button>
            )}
            {lyrics.length > 0 && !disabled && (
                <>
                    <button
                        onClick={handleCopy}
                        className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                        aria-label={copied ? "Copied" : "Copy lyrics"}
                        title={copied ? "Copied!" : "Copy lyrics"}
                    >
                        {copied ? <CheckIcon className="w-5 h-5 text-teal-400" /> : <CopyIcon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setLyrics('')}
                        className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
                        aria-label="Clear lyrics"
                        title="Clear lyrics"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default LyricsInput;
