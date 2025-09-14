import React, { useState, useRef } from 'react';
import { MusicNoteIcon, UploadIcon, PlayIcon, PauseIcon } from './icons';

interface FileUploadProps {
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;
  disabled: boolean;
  videoUrl: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ videoFile, setVideoFile, disabled, videoUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setVideoFile(e.dataTransfer.files[0]);
    }
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }
  };

  const isAudio = videoFile?.type.startsWith('audio/');

  if (videoFile && videoUrl) {
    if (isAudio) {
      return (
        <div className="relative group">
            {/* Hidden audio element for playback control */}
            <audio 
                ref={audioRef}
                src={videoUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />
            {/* Visible custom control */}
            <div 
                onClick={handlePlayPause}
                className="bg-gray-800 rounded-lg p-3 flex items-center w-full cursor-pointer hover:bg-gray-700 transition-colors"
                role="button"
                aria-label={`Play or pause audio file ${videoFile.name}`}
            >
                <button 
                    className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600 text-white flex-shrink-0 mr-3"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                </button>
                <span className="text-sm text-gray-300 truncate" title={videoFile.name}>
                    {videoFile.name}
                </span>
            </div>
            {/* Remove button appears on hover */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering play/pause
                        setVideoFile(null);
                    }}
                    disabled={disabled}
                    className="px-3 py-1 text-sm bg-red-600 bg-opacity-80 hover:bg-red-700 hover:bg-opacity-100 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                    aria-label="Remove media"
                >
                    Remove
                </button>
            </div>
        </div>
      );
    }
    
    // Video Preview
    return (
      <div className="relative group bg-black rounded-lg max-h-48 flex items-center justify-center">
        <video 
            src={videoUrl} 
            controls 
            className="w-full max-h-full max-w-full rounded-lg object-contain relative z-10 bg-transparent"
            aria-label="Video preview"
        >
          Your browser does not support the video tag.
        </video>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <button
            onClick={() => setVideoFile(null)}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-red-600 bg-opacity-80 hover:bg-red-700 hover:bg-opacity-100 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
            aria-label="Remove media"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="dropzone-file"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-teal-400">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500">Video (MP4, MOV) or Audio (MP3, WAV)</p>
          <p className="text-xs text-gray-500">Max file size: 15MB</p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};

export default FileUpload;