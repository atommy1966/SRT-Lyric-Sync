import React, { useState, useEffect } from 'react';
import { SrtEntryData, normalizeTimestamp } from '../utils/srtUtils';
import { GripVerticalIcon } from './icons';

interface SrtEntryProps {
  entry: SrtEntryData;
  onUpdate: (index: number, field: keyof SrtEntryData, value: string | number) => void;
  onContextMenu: (event: React.MouseEvent) => void;
  isFirst: boolean;
  isLast: boolean;
  // Drag & Drop props
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

const SrtEntry: React.FC<SrtEntryProps> = ({ 
    entry, 
    onUpdate, 
    onContextMenu, 
    isFirst, 
    isLast,
    index,
    isDragging,
    isDragOver,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
}) => {
  const [startTime, setStartTime] = useState(entry.startTime);
  const [endTime, setEndTime] = useState(entry.endTime);

  // Sync with parent state if it changes (e.g., from global offset)
  useEffect(() => {
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
  }, [entry.startTime, entry.endTime]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startTime' | 'endTime') => {
    if (field === 'startTime') {
      setStartTime(e.target.value);
    } else {
      setEndTime(e.target.value);
    }
  };

  const handleTimeBlur = (field: 'startTime' | 'endTime') => {
    const value = field === 'startTime' ? startTime : endTime;
    const normalizedValue = normalizeTimestamp(value);

    // Update local state to show formatted value
    if (field === 'startTime') {
      setStartTime(normalizedValue);
    } else {
      setEndTime(normalizedValue);
    }
    
    // Propagate change to parent only if it's actually different
    const parentValue = field === 'startTime' ? entry.startTime : entry.endTime;
    if (normalizedValue !== parentValue) {
      onUpdate(entry.index, field, normalizedValue);
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(entry.index, 'text', e.target.value);
  };
  
  const containerClasses = [
    "bg-gray-900/70",
    "rounded-lg",
    "p-3",
    "flex",
    "gap-3",
    "items-start",
    "transition-all",
    "duration-200",
    isDragging ? "opacity-30" : "opacity-100",
    isDragOver ? "ring-2 ring-teal-500" : ""
  ].join(" ");

  return (
    <div 
        className={containerClasses}
        onContextMenu={onContextMenu}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
        onDragEnd={onDragEnd}
    >
        <div className="flex-shrink-0 cursor-move pt-1" title="Drag to reorder">
            <GripVerticalIcon className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-gray-500 select-none w-6 text-center">{entry.index}</span>
                <input
                    type="text"
                    value={startTime}
                    onChange={(e) => handleTimeChange(e, 'startTime')}
                    onBlur={() => handleTimeBlur('startTime')}
                    className="w-28 bg-gray-700 font-mono text-sm p-1 rounded border border-gray-600 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    aria-label={`Start time for entry ${entry.index}`}
                />
                <span className="text-gray-500">→</span>
                <input
                    type="text"
                    value={endTime}
                    onChange={(e) => handleTimeChange(e, 'endTime')}
                    onBlur={() => handleTimeBlur('endTime')}
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
    </div>
  );
};

export default SrtEntry;