import React, { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, CopyIcon, DownloadIcon, PlusIcon, RedoIcon, SparklesIcon, UndoIcon } from './icons';
import { serializeSrt, SrtEntryData, msToTimestamp, timestampToMs } from '../utils/srtUtils';
import SrtEntry from './SrtEntry';
import Loader from './Loader';
import ContextMenu from './ContextMenu';

interface SrtDisplayProps {
  entries: SrtEntryData[];
  setEntries: React.Dispatch<React.SetStateAction<SrtEntryData[]>>;
  videoFileName: string;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRefine: () => void;
  isRefining: boolean;
  offset: number;
  setOffset: (offset: number) => void;
}

interface ContextMenuState {
    x: number;
    y: number;
    entry: SrtEntryData;
    isFirst: boolean;
    isLast: boolean;
}

const SrtDisplay: React.FC<SrtDisplayProps> = ({ 
    entries, 
    setEntries, 
    videoFileName, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    onRefine,
    isRefining,
    offset,
    setOffset
}) => {
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleOffsetChange = (newOffsetValue: number) => {
    const diff = newOffsetValue - offset;
    if (diff === 0) return;

    setEntries(currentEntries => currentEntries.map(entry => {
        const newStartTime = timestampToMs(entry.startTime) + diff;
        const newEndTime = timestampToMs(entry.endTime) + diff;
        return {
            ...entry,
            startTime: msToTimestamp(newStartTime),
            endTime: msToTimestamp(newEndTime),
        };
    }));
    setOffset(newOffsetValue);
  };

  const getCurrentSrtContent = () => {
    return serializeSrt(entries);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentSrtContent());
    setCopied(true);
  };

  const handleDownload = () => {
    const content = getCurrentSrtContent();
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

  const handleAdd = () => {
    setEntries(currentEntries => {
        const newIndex = currentEntries.length + 1;
        const lastEntry = currentEntries[currentEntries.length - 1];
        const newEntry: SrtEntryData = {
        index: newIndex,
        startTime: lastEntry?.endTime || '00:00:00,000',
        endTime: lastEntry?.endTime || '00:00:00,000',
        text: 'New subtitle'
        };
        return [...currentEntries, newEntry];
    });
  };

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

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
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
    <div className="bg-gray-800 rounded-lg h-full flex flex-col relative" onClick={contextMenu ? closeContextMenu : undefined}>
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
      <div className={`p-3 bg-gray-900/50 rounded-t-lg border-b border-gray-700 sticky top-0 z-10 transition-all ${allControlsDisabled ? 'filter blur-sm' : ''}`}>
        <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-300">SRT Editor</h3>
            <div className="flex items-center space-x-2">
            <button onClick={undo} disabled={!canUndo || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Undo">
                <UndoIcon className="w-5 h-5" />
            </button>
            <button onClick={redo} disabled={!canRedo || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Redo">
                <RedoIcon className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-gray-700"></div>

            <button onClick={onRefine} disabled={allControlsDisabled} className="flex items-center px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Use AI to improve timing accuracy">
                <SparklesIcon className="w-5 h-5 mr-2" />
                Refine
            </button>
            <button onClick={handleCopy} disabled={allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Copy to clipboard">
                {copied ? <span className="text-sm text-teal-400">Copied!</span> : <CopyIcon className="w-5 h-5" />}
            </button>
            <button onClick={handleDownload} disabled={allControlsDisabled} className="flex items-center px-3 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" title="Download .srt file">
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download
            </button>
            </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-700/50">
            <label htmlFor="timing-offset-slider" className="block text-sm font-medium text-gray-300 mb-2">Global Timing Offset</label>
            <div className="flex items-center gap-3">
                <input
                    id="timing-offset-slider"
                    type="range"
                    min="-5000"
                    max="5000"
                    step="1"
                    value={offset}
                    onChange={(e) => handleOffsetChange(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    disabled={allControlsDisabled}
                    title={`${offset}ms`}
                />
                <input
                    type="number"
                    value={offset}
                    onChange={(e) => handleOffsetChange(parseInt(e.target.value, 10) || 0)}
                    className="w-24 bg-gray-700 text-center p-1 rounded border border-gray-600 disabled:opacity-50"
                    step="1"
                    aria-label="Timing offset in milliseconds"
                    disabled={allControlsDisabled}
                />
                <button onClick={() => handleOffsetChange(0)} disabled={offset === 0 || allControlsDisabled} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Reset offset">
                    <ArrowPathIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
      <div className={`p-2 overflow-auto flex-grow transition-all ${allControlsDisabled ? 'filter blur-sm pointer-events-none' : ''}`}>
        <div className="space-y-2">
            {entries.map((entry, idx) => (
                <SrtEntry 
                    key={entry.index} 
                    entry={entry}
                    isFirst={idx === 0}
                    isLast={idx === entries.length - 1}
                    onUpdate={handleUpdate}
                    onContextMenu={(e) => handleContextMenu(e, entry, idx === 0, idx === entries.length - 1)}
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
        <div className="mt-4 flex justify-center">
            <button 
                onClick={handleAdd}
                className="flex items-center px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                title="Add new subtitle line to the end"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Line to End
            </button>
        </div>
      </div>
    </div>
  );
};

export default SrtDisplay;