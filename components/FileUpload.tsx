import React from 'react';
import { MusicNoteIcon, UploadIcon } from './icons';

interface FileUploadProps {
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;
  disabled: boolean;
  videoUrl: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ videoFile, setVideoFile, disabled, videoUrl }) => {
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

  const isAudio = videoFile?.type.startsWith('audio/');

  if (videoFile && videoUrl) {
    return (
      <div className="relative group bg-black rounded-lg aspect-video flex items-center justify-center">
        {isAudio && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                <MusicNoteIcon className="w-24 h-24 text-gray-600" />
            </div>
        )}
        <video 
            src={videoUrl} 
            controls 
            className="w-full h-full rounded-lg object-contain relative z-10 bg-transparent"
            aria-label={isAudio ? "Audio preview" : "Video preview"}
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
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-teal-400">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500">Video (MP4, MOV) or Audio (MP3, WAV)</p>
        </div>
        <input id="dropzone-file" type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileChange} disabled={disabled} />
      </label>
    </div>
  );
};

export default FileUpload;
