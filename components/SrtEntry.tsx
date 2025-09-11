import React, { useState, useEffect, useRef } from 'react';
import { SrtEntryData, normalizeTimestamp, timestampToMs, msToTimestamp } from '../utils/srtUtils';
import { GripVerticalIcon, ScissorsIcon, TargetIcon } from './icons';

interface SrtEntryProps {
  entry: SrtEntryData;
  onUpdate: (index: number, field: keyof SrtEntryData, value: string | number) => void;
  onSetTimeToCurrent: (entryIndex: number, field: 'startTime' | 'endTime') => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onSplit: (index: number, cursorPosition: number) => void;
  onClick: (event: React.MouseEvent) => void;
  isActive: boolean;
  isCurrent: boolean;
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
    onSetTimeToCurrent,
    onContextMenu,
    onSplit,
    onClick,
    isActive, 
    isCurrent,
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
  const [cursorPosition, setCursorPosition] = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleTextareaEvent = () => {
    if (textAreaRef.current) {
        setCursorPosition(textAreaRef.current.selectionStart);
    }
  };

  const handleSplitClick = () => {
    if (cursorPosition > 0 && cursorPosition < entry.text.length) {
        onSplit(entry.index, cursorPosition);
    }
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'startTime' | 'endTime') => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
      return;
    }
    
    // Prevent the cursor from moving to the start/end of the input and page scroll
    e.preventDefault();

    const currentValue = entry[field]; // Read directly from the prop for consistency
    const ms = timestampToMs(currentValue);
    
    const increment = e.shiftKey ? 1000 : 100; // 1s for shift, 100ms otherwise

    const newMs = e.key === 'ArrowUp' ? ms + increment : ms - increment;
    const newTimestamp = msToTimestamp(newMs);
    
    // Directly call the parent update function.
    // The component will re-render with the new prop, and useEffect will update the local state.
    onUpdate(entry.index, field, newTimestamp);
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
    "cursor-pointer",
    "border",
    isDragging ? "opacity-30" : "opacity-100",
    isDragOver ? "border-teal-500 ring-2 ring-teal-500" :
    isActive ? "border-blue-500 ring-2 ring-blue-500" :
    isCurrent ? "border-teal-700 bg-teal-900/30" :
    "border-transparent hover:bg-gray-800/90",
  ].filter(Boolean).join(" ");


  const TimeInput: React.FC<{
    field: 'startTime' | 'endTime';
    value: string;
  }> = ({ field, value }) => (
      <div className="relative group">
          <input
              type="text"
              value={value}
              onChange={(e) => handleTimeChange(e, field)}
              onBlur={() => handleTimeBlur(field)}
              onKeyDown={(e) => handleTimeKeyDown(e, field)}
              className="w-full bg-gray-700 font-mono text-sm p-1 rounded border border-gray-600 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none pr-7"
              aria-label={`${field === 'startTime' ? 'Start' : 'End'} time for entry ${entry.index}. Use Arrow keys to adjust.`}
              title="Use Arrow Up/Down to adjust by 100ms. Hold Shift for 1s."
          />
          <button
              onClick={() => onSetTimeToCurrent(entry.index, field)}
              className="absolute right-0 top-0 h-full px-1.5 flex items-center text-gray-400 hover:text-teal-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              title="Set to video's current time"
              aria-label={`Set ${field === 'startTime' ? 'start' : 'end'} time to video's current time`}
          >
              <TargetIcon className="w-4 h-4" />
          </button>
      </div>
  );

  return (
    <div 
        className={containerClasses}
        onClick={onClick}
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
            <div className="flex items-center gap-2 mb-2 w-full max-w-sm">
                <span className="font-mono text-xs text-gray-500 select-none w-6 text-center">{entry.index}</span>
                <div className="flex-1">
                    <TimeInput field="startTime" value={startTime} />
                </div>
                <span className="text-gray-500">→</span>
                <div className="flex-1">
                    <TimeInput field="endTime" value={endTime} />
                </div>
            </div>
            <textarea
                ref={textAreaRef}
                value={entry.text}
                onChange={handleTextChange}
                onKeyUp={handleTextareaEvent}
                onMouseUp={handleTextareaEvent}
                onFocus={handleTextareaEvent}
                className="w-full bg-gray-800 p-2 rounded border border-gray-600 resize-y min-h-[4rem] focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                rows={2}
                aria-label={`Text for entry ${entry.index}`}
            />
            {isActive && (
                <div className="mt-2">
                    <button
                        onClick={handleSplitClick}
                        disabled={cursorPosition === 0 || cursorPosition >= entry.text.length}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-600 hover:bg-indigo-600 rounded-md transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                        title="Split subtitle at cursor position"
                    >
                        <ScissorsIcon className="w-4 h-4" />
                        Split Line
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default SrtEntry;