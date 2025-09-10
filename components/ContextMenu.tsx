import React, { useEffect, useRef } from 'react';
import { SrtEntryData } from '../utils/srtUtils';
import { ArrowDownIcon, ArrowUpIcon, ChevronDoubleDownIcon, PlusIcon, TrashIcon } from './icons';

interface ContextMenuProps {
  x: number;
  y: number;
  entry: SrtEntryData;
  isFirst: boolean;
  isLast: boolean;
  onClose: () => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onInsert: (index: number) => void;
  onMerge: (index: number) => void;
  onDelete: (index: number) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, entry, isFirst, isLast, onClose, onMove, onInsert, onMerge, onDelete }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // A slight delay to prevent the same click event that opened the menu from closing it.
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };

    const menuStyle: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 50,
    };

    const MenuItem: React.FC<{
        label: string;
        icon: React.ReactNode;
        onClick: () => void;
        disabled?: boolean;
        className?: string;
    }> = ({ label, icon, onClick, disabled = false, className = '' }) => (
        <button
            onClick={disabled ? undefined : () => handleAction(onClick)}
            disabled={disabled}
            className={`w-full flex items-center px-4 py-2 text-sm text-left transition-colors duration-150 ${
                disabled 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-gray-200 hover:bg-gray-700'
            } ${className}`}
        >
            <span className="mr-3">{icon}</span>
            {label}
        </button>
    );

    return (
        <div 
            ref={menuRef} 
            style={menuStyle}
            className="w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1"
        >
            <MenuItem 
                label="Move Up" 
                icon={<ArrowUpIcon className="w-4 h-4" />}
                onClick={() => onMove(entry.index, 'up')}
                disabled={isFirst}
            />
            <MenuItem 
                label="Move Down" 
                icon={<ArrowDownIcon className="w-4 h-4" />}
                onClick={() => onMove(entry.index, 'down')}
                disabled={isLast}
            />
            <div className="border-t border-gray-700 my-1"></div>
            <MenuItem 
                label="Insert Line Below" 
                icon={<PlusIcon className="w-4 h-4" />}
                onClick={() => onInsert(entry.index)}
            />
            <MenuItem 
                label="Merge with Next" 
                icon={<ChevronDoubleDownIcon className="w-4 h-4" />}
                onClick={() => onMerge(entry.index)}
                disabled={isLast}
            />
            <div className="border-t border-gray-700 my-1"></div>
            <MenuItem 
                label="Delete" 
                icon={<TrashIcon className="w-4 h-4" />}
                onClick={() => onDelete(entry.index)}
                className="text-red-400 hover:bg-red-800/50"
            />
        </div>
    );
};

export default ContextMenu;
