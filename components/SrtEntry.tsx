import React from 'react';
import { SrtEntryData } from '../utils/srtUtils';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from './icons';

interface SrtEntryProps {
  entry: SrtEntryData;
  onUpdate: (index: number, field: keyof SrtEntryData, value: string | number) => void;
  onDelete: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
}

const SrtEntry: React.FC<SrtEntryProps> = ({ entry, onUpdate, onDelete, onMove, isFirst, isLast }) => {

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startTime' | 'endTime') => {
    onUpdate(entry.index, field, e.target.value);
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(entry.index, 'text', e.target.value);
  };
  
  return (
    <div className="bg-gray-900/70 rounded-lg p-3 flex gap-3 items-start">
        <div className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
                <input
                    type="text"
                    value={entry.startTime}
                    onChange={(e) => handleTimeChange(e, 'startTime')}
                    className="w-28 bg-gray-700 font-mono text-sm p-1 rounded border border-gray-600 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    aria-label={`Start time for entry ${entry.index}`}
                />
                <span className="text-gray-500">→</span>
                <input
                    type="text"
                    value={entry.endTime}
                    onChange={(e) => handleTimeChange(e, 'endTime')}
                    className="w-28 bg-gray-700 font-mono text-sm p-1 rounded border border-gray-600 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    aria-label={`End time for entry ${entry.index}`}
                />
            </div>
            <textarea
                value={entry.text}
                onChange={handleTextChange}
                className="w-full bg-gray-800 p-2 rounded border border-gray-600 resize-y min-h-[4rem] focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                rows={2}
                aria-label={`Text for entry ${entry.index}`}
            />
        </div>
        <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => onMove(entry.index, 'up')}
              disabled={isFirst}
              className="p-1.5 rounded-md hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
                <ArrowUpIcon className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-gray-500 select-none">{entry.index}</span>
            <button 
              onClick={() => onMove(entry.index, 'down')}
              disabled={isLast}
              className="p-1.5 rounded-md hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
                <ArrowDownIcon className="w-4 h-4" />
            </button>
             <button 
              onClick={() => onDelete(entry.index)}
              className="p-1.5 rounded-md hover:bg-red-800/50 text-red-400 mt-4"
              title="Delete"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
  );
};

export default SrtEntry;
