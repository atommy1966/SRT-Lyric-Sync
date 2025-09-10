import React from 'react';
import { SrtEntryData, serializeSrt, srtToVtt, serializeLrc } from '../utils/srtUtils';
import { DownloadIcon, XIcon } from './icons';

interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entries: SrtEntryData[];
  videoFileName: string;
}

const DownloadDialog: React.FC<DownloadDialogProps> = ({ isOpen, onClose, entries, videoFileName }) => {
  if (!isOpen) return null;

  const getBaseName = () => videoFileName.substring(0, videoFileName.lastIndexOf('.')) || 'lyrics';

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
    onClose();
  };

  const handleDownload = (format: 'srt' | 'vtt' | 'lrc') => {
    const baseName = getBaseName();
    let content = '';
    let fileName = '';
    let mimeType = 'text/plain';

    switch (format) {
      case 'srt':
        content = serializeSrt(entries);
        fileName = `${baseName}.srt`;
        break;
      case 'vtt':
        content = srtToVtt(serializeSrt(entries));
        fileName = `${baseName}.vtt`;
        mimeType = 'text/vtt';
        break;
      case 'lrc':
        content = serializeLrc(entries);
        fileName = `${baseName}.lrc`;
        break;
    }
    
    downloadFile(content, fileName, mimeType);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-dialog-title"
    >
      <div 
        className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md p-6 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="download-dialog-title" className="text-xl font-semibold text-white">Choose Download Format</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" aria-label="Close dialog">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-400 mb-6">Select the format for your subtitle file.</p>
        <div className="space-y-3">
          <FormatButton 
            format="SRT"
            description="Standard subtitle format, compatible with most video players."
            onClick={() => handleDownload('srt')}
          />
          <FormatButton 
            format="VTT"
            description="Modern format for web videos, used by HTML5 players."
            onClick={() => handleDownload('vtt')}
          />
          <FormatButton 
            format="LRC"
            description="Lyric format for music players, shows line-by-line."
            onClick={() => handleDownload('lrc')}
          />
        </div>
      </div>
    </div>
  );
};

const FormatButton: React.FC<{format: string, description: string, onClick: () => void}> = ({ format, description, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full text-left p-4 rounded-lg bg-gray-900/50 hover:bg-gray-700/70 border border-gray-700 hover:border-teal-500 transition-all duration-200 group"
    >
        <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <span className="font-bold text-lg text-teal-400">{format}</span>
                <span className="text-sm text-gray-400">{description}</span>
            </div>
            <DownloadIcon className="w-6 h-6 text-gray-500 group-hover:text-teal-300 transition-colors" />
        </div>
    </button>
);


export default DownloadDialog;
