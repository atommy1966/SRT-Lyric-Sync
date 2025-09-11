


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SrtEntryData } from '../utils/srtUtils';
import SrtEntry from './SrtEntry';
import Loader from './Loader';
import ContextMenu from './ContextMenu';

interface SrtDisplayProps {
  entries: SrtEntryData[];
  setEntries: React.Dispatch<React.SetStateAction<SrtEntryData[]>>;
  isRefining: boolean;
}

interface ContextMenuState {
    x: number;
    y: number;
    entry: SrtEntryData;
    isFirst: boolean;
    isLast: boolean;
}

// Helper hook to track the previous value of a prop or state.
function usePrevious<T>(value: T) {
  // FIX: Explicitly initialize useRef with `undefined`. The `useRef<T>()` overload, while valid in recent
  // @types/react versions, can cause an "Expected 1 arguments, but got 0" error with older setups.
  // This more explicit form is safer and universally compatible.
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}


const SrtDisplay: React.FC<SrtDisplayProps> = ({ 
    entries, 
    setEntries, 
    isRefining,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevEntriesLength = usePrevious(entries.length);

  useEffect(() => {
      // If a new entry was added (length increased), scroll to the bottom.
      if (prevEntriesLength !== undefined && entries.length > prevEntriesLength) {
          const container = scrollContainerRef.current;
          if (container) {
              // Using smooth scroll for a better UX
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }
      }
  }, [entries.length, prevEntriesLength]);

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
  
  const handleDelete = useCallback((index: number) => {
    setEntries(currentEntries => 
        currentEntries.filter(e => e.index !== index)
                      .map((e, i) => ({ ...e, index: i + 1 }))
    );
  }, [setEntries]);

  const handleMove = useCallback((originalIndex: number, direction: 'up' | 'down') => {
      setEntries(currentEntries => {
        const arrayIndex = currentEntries.findIndex(e => e.index === originalIndex);
        if (arrayIndex === -1) return currentEntries;
    
        const newEntries = [...currentEntries];
        const targetIndex = direction === 'up' ? arrayIndex - 1 : arrayIndex + 1;
    
        if (targetIndex >= 0 && targetIndex < newEntries.length) {
            [newEntries[arrayIndex], newEntries[targetIndex]] = [newEntries[targetIndex], newEntries[arrayIndex]];
            return newEntries.map((e, i) => ({ ...e, index: i + 1 }));
        }
        return currentEntries;
      });
  }, [setEntries]);

  const handleInsert = useCallback((afterIndex: number) => {
    setEntries(currentEntries => {
        const insertAtIndex = currentEntries.findIndex(e => e.index === afterIndex);
        if (insertAtIndex === -1) return currentEntries;

        const previousEntry = currentEntries[insertAtIndex];

        const newEntry: SrtEntryData = {
            index: 0, 
            startTime: previousEntry.endTime,
            endTime: previousEntry.endTime,
            text: 'New subtitle'
        };

        const newEntries = [...currentEntries];
        newEntries.splice(insertAtIndex + 1, 0, newEntry);
        
        return newEntries.map((e, i) => ({ ...e, index: i + 1 }));
    });
  }, [setEntries]);

  const handleMerge = useCallback((indexToMerge: number) => {
    setEntries(currentEntries => {
        const mergeArrayIndex = currentEntries.findIndex(e => e.index === indexToMerge);
        
        if (mergeArrayIndex === -1 || mergeArrayIndex >= currentEntries.length - 1) {
            return currentEntries;
        }

        const entry1 = currentEntries[mergeArrayIndex];
        const entry2 = currentEntries[mergeArrayIndex + 1];

        const mergedEntry: SrtEntryData = {
            ...entry1,
            endTime: entry2.endTime,
            text: `${entry1.text}\n${entry2.text}`.trim(),
        };

        const newEntries = [...currentEntries];
        newEntries[mergeArrayIndex] = mergedEntry;
        newEntries.splice(mergeArrayIndex + 1, 1);
        
        return newEntries.map((e, i) => ({ ...e, index: i + 1 }));
    });
  }, [setEntries]);
  
  const handleContextMenu = (e: React.MouseEvent, entry: SrtEntryData, isFirst: boolean, isLast: boolean) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, entry, isFirst, isLast });
  };
  const closeContextMenu = () => setContextMenu(null);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;
      setDragOverIndex(index);
  };
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null) return;

      setEntries(currentEntries => {
          const newEntries = [...currentEntries];
          const [draggedItem] = newEntries.splice(draggedIndex, 1);
          newEntries.splice(dropIndex, 0, draggedItem);
          return newEntries.map((entry, i) => ({...entry, index: i + 1}));
      });
  };
  
  const handleDragEnd = () => {
      setDraggedIndex(null);
      setDragOverIndex(null);
  };

  const allControlsDisabled = isRefining;

  return (
    <div className="flex flex-col relative flex-grow min-h-0" onClick={contextMenu ? closeContextMenu : undefined}>
      {isRefining && (
          <div className="absolute inset-0 z-30 rounded-lg">
              <Loader message="Refining timings..." />
          </div>
      )}
      {contextMenu && (
          <ContextMenu 
              x={contextMenu.x}
              y={contextMenu.y}
              entry={contextMenu.entry}
              isFirst={contextMenu.isFirst}
              isLast={contextMenu.isLast}
              onClose={closeContextMenu}
              onDelete={handleDelete}
              onInsert={handleInsert}
              onMerge={handleMerge}
              onMove={handleMove}
          />
      )}
      <div 
        ref={scrollContainerRef}
        className={`p-2 transition-all flex-grow min-h-0 overflow-y-auto ${allControlsDisabled ? 'filter blur-sm pointer-events-none' : ''}`}
        onClick={() => setActiveIndex(null)}
      >
        <div className="space-y-2">
            {entries.map((entry, idx) => (
                <SrtEntry 
                    key={entry.index} 
                    entry={entry}
                    isFirst={idx === 0}
                    isLast={idx === entries.length - 1}
                    onUpdate={handleUpdate}
                    onContextMenu={(e) => handleContextMenu(e, entry, idx === 0, idx === entries.length - 1)}
                    // Highlight on click
                    isActive={activeIndex === entry.index}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent container click from deselecting
                        setActiveIndex(entry.index);
                    }}
                    // Drag & Drop props
                    index={idx}
                    isDragging={draggedIndex === idx}
                    isDragOver={dragOverIndex === idx}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SrtDisplay;