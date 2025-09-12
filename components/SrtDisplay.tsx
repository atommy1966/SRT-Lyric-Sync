

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SrtEntryData, msToTimestamp, timestampToMs } from '../utils/srtUtils';
import SrtEntry from './SrtEntry';
import Loader from './Loader';
import ContextMenu from './ContextMenu';

interface SrtDisplayProps {
  entries: SrtEntryData[];
  setEntries: (updater: (prevEntries: SrtEntryData[]) => SrtEntryData[]) => void;
  isRefining: boolean;
  onSetTimeToCurrent: (entryIndex: number, field: 'startTime' | 'endTime') => void;
  currentTime: number;
  onEntryClick: (entry: SrtEntryData) => void;
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
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
    onSetTimeToCurrent,
    currentTime,
    onEntryClick,
    activeIndex,
    setActiveIndex
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null); // Ref for the inner list container
  const previousCurrentIndexRef = useRef<number | null>(null); // Ref to track the last active index for scrolling
  const prevEntriesLength = usePrevious(entries.length);
  const justInsertedInMiddleRef = useRef(false);

  // Auto-scroll to the currently playing subtitle
  useEffect(() => {
    // Determine the array index of the currently playing entry
    const currentTimeMs = currentTime * 1000;
    const currentIndex = entries.findIndex(entry => {
        const startTimeMs = timestampToMs(entry.startTime);
        const endTimeMs = timestampToMs(entry.endTime);
        return currentTimeMs >= startTimeMs && currentTimeMs < endTimeMs;
    });

    // Only scroll if the active entry has changed and is visible in the list
    if (currentIndex !== -1 && currentIndex !== previousCurrentIndexRef.current) {
      const list = listContainerRef.current;
      if (list && list.children[currentIndex]) {
        const element = list.children[currentIndex] as HTMLElement;
        // The element is scrolled into view smoothly, centered vertically.
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
    
    // Update the ref to track the last scrolled-to index
    previousCurrentIndexRef.current = currentIndex;
  }, [currentTime, entries]);


  // Scroll to the bottom when a new line is added via the main button
  useEffect(() => {
      // If we just inserted an item in the middle, don't scroll to the bottom.
      if (justInsertedInMiddleRef.current) {
          justInsertedInMiddleRef.current = false;
          return;
      }

      // If a new entry was added (length increased), scroll to the bottom.
      // This is intended for the main "Add Line" button.
      if (prevEntriesLength !== undefined && entries.length > prevEntriesLength) {
          const container = scrollContainerRef.current;
          if (container) {
              // Using smooth scroll for a better UX
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }
      }
  }, [entries.length, prevEntriesLength]);

  const handleUpdate = (index: number, field: keyof SrtEntryData, value: string | number) => {
    setEntries(currentEntries =>
      currentEntries.map(entry =>
        entry.index === index
          ? { ...entry, [field]: value }
          : entry
      )
    );
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
    justInsertedInMiddleRef.current = true; // Set the flag before updating state to prevent scrolling.
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

  const handleSplit = useCallback((indexToSplit: number, splitAt: number) => {
    justInsertedInMiddleRef.current = true; // Prevent auto-scroll to bottom
    setEntries(currentEntries => {
        const arrayIndex = currentEntries.findIndex(e => e.index === indexToSplit);
        if (arrayIndex === -1) return currentEntries;

        const originalEntry = currentEntries[arrayIndex];
        const originalText = originalEntry.text;

        if (splitAt <= 0 || splitAt >= originalText.length) {
            return currentEntries; // Cannot split at the edges
        }

        const text1 = originalText.substring(0, splitAt).trim();
        const text2 = originalText.substring(splitAt).trim();

        if (!text1 || !text2) {
             // Avoid creating empty entries if splitting results in one empty part
            return currentEntries;
        }
        
        const startTimeMs = timestampToMs(originalEntry.startTime);
        const endTimeMs = timestampToMs(originalEntry.endTime);
        const durationMs = endTimeMs - startTimeMs;
        
        let splitTimeMs = startTimeMs;
        if (durationMs > 0) {
            splitTimeMs = startTimeMs + Math.round(durationMs * (splitAt / originalText.length));
        }

        const updatedOriginalEntry = {
            ...originalEntry,
            endTime: msToTimestamp(splitTimeMs),
            text: text1,
        };

        const newEntry: SrtEntryData = {
            index: 0, // Will be re-indexed later
            startTime: msToTimestamp(splitTimeMs),
            endTime: originalEntry.endTime, // Use original end time
            text: text2,
        };
        
        const newEntries = [...currentEntries];
        newEntries.splice(arrayIndex + 1, 0, newEntry);
        newEntries[arrayIndex] = updatedOriginalEntry;

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
        <div className="space-y-2" ref={listContainerRef}>
            {entries.map((entry, idx) => {
                const currentTimeMs = currentTime * 1000;
                const startTimeMs = timestampToMs(entry.startTime);
                const endTimeMs = timestampToMs(entry.endTime);
                const isCurrent = currentTimeMs >= startTimeMs && currentTimeMs < endTimeMs;
                
                return (
                    <SrtEntry 
                        key={entry.index} 
                        entry={entry}
                        isFirst={idx === 0}
                        isLast={idx === entries.length - 1}
                        onUpdate={handleUpdate}
                        onSetTimeToCurrent={onSetTimeToCurrent}
                        onContextMenu={(e) => handleContextMenu(e, entry, idx === 0, idx === entries.length - 1)}
                        onSplit={handleSplit}
                        // Highlight on click
                        isActive={activeIndex === entry.index}
                        isCurrent={isCurrent}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent container click from deselecting
                            onEntryClick(entry);
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
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default SrtDisplay;