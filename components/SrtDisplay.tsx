import React, { useState, useEffect } from 'react';
import { CopyIcon, DownloadIcon, PlusIcon } from './icons';
import { serializeSrt, SrtEntryData } from '../utils/srtUtils';
import SrtEntry from './SrtEntry';

interface SrtDisplayProps {
  entries: SrtEntryData[];
  setEntries: React.Dispatch<React.SetStateAction<SrtEntryData[]>>;
  videoFileName: string;
}

const SrtDisplay: React.FC<SrtDisplayProps> = ({ entries, setEntries, videoFileName }) => {
  const [copied, setCopied] = useState(false);

  const getCurrentSrtContent = () => {
    return serializeSrt(entries);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentSrtContent());
    setCopied(true);
  };

  const handleDownload = () => {
    const content = getCurrentSrtContent();
    // Add a BOM (Byte Order Mark) to the beginning of the file to improve compatibility
    // with various text editors and video players, especially on Windows.
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = videoFileName.substring(0, videoFileName.lastIndexOf('.')) || 'lyrics';
    a.download = `${baseName}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleUpdate = (index: number, field: keyof SrtEntryData, value: string | number) => {
    setEntries(currentEntries => {
        const newEntries = [...currentEntries];
        const entryToUpdate = newEntries.find(e => e.index === index);
        if (entryToUpdate) {
            (entryToUpdate[field] as string | number) = value;
        }
        return newEntries;
    });
  };
  
  const handleDelete = (index: number) => {
    setEntries(currentEntries => 
        currentEntries.filter(e => e.index !== index)
                      .map((e, i) => ({ ...e, index: i + 1 }))
    );
  };

  const handleMove = (originalIndex: number, direction: 'up' | 'down') => {
      setEntries(currentEntries => {
        const arrayIndex = currentEntries.findIndex(e => e.index === originalIndex);
        if (arrayIndex === -1) return currentEntries;
    
        const newEntries = [...currentEntries];
        const targetIndex = direction === 'up' ? arrayIndex - 1 : arrayIndex + 1;
    
        if (targetIndex >= 0 && targetIndex < newEntries.length) {
            [newEntries[arrayIndex], newEntries[targetIndex]] = [newEntries[targetIndex], newEntries[arrayIndex]];
            // Re-assign indices to maintain order
            return newEntries.map((e, i) => ({ ...e, index: i + 1 }));
        }
        return currentEntries;
      });
  };

  const handleAdd = () => {
    setEntries(currentEntries => {
        const newIndex = currentEntries.length + 1;
        const lastEntry = currentEntries[currentEntries.length - 1];
        const newEntry: SrtEntryData = {
        index: newIndex,
        startTime: lastEntry?.endTime || '00:00:00,000',
        endTime: '00:00:00,000',
        text: 'New subtitle'
        };
        return [...currentEntries, newEntry];
    });
  };


  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-t-lg border-b border-gray-700 sticky top-0 z-10">
        <h3 className="font-semibold text-gray-300">SRT Editor</h3>
        <div className="flex items-center space-x-2">
          <button onClick={handleCopy} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white" title="Copy to clipboard">
            {copied ? <span className="text-sm text-teal-400">Copied!</span> : <CopyIcon className="w-5 h-5" />}
          </button>
          <button onClick={handleDownload} className="flex items-center px-3 py-2 text-sm bg-teal-600 hover:bg-teal-700 rounded-md transition-colors" title="Download .srt file">
            <DownloadIcon className="w-5 h-5 mr-2" />
            Download
          </button>
        </div>
      </div>
      <div className="p-2 overflow-auto flex-grow">
        <div className="space-y-2">
            {entries.map((entry, idx) => (
                <SrtEntry 
                    key={entry.index} 
                    entry={entry} 
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    isFirst={idx === 0}
                    isLast={idx === entries.length - 1}
                />
            ))}
        </div>
        <div className="mt-4 flex justify-center">
            <button 
                onClick={handleAdd}
                className="flex items-center px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                title="Add new subtitle line"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Line
            </button>
        </div>
      </div>
    </div>
  );
};

export default SrtDisplay;