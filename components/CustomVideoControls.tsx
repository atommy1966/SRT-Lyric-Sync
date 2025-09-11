import React from 'react';
import { PlayIcon, PauseIcon, VolumeUpIcon, VolumeOffIcon, ExpandIcon } from './icons';

interface CustomVideoControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onFullscreen: () => void;
  isVisible: boolean;
}

const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) {
    return '00:00';
  }
  const time = Math.floor(timeInSeconds);
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const CustomVideoControls: React.FC<CustomVideoControlsProps> = ({
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  onFullscreen,
  isVisible,
}) => {

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Seek Bar */}
      <div className="relative mb-2 group">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-gray-500/50 rounded-lg appearance-none cursor-pointer group-hover:h-2 transition-all duration-200"
          style={{
            background: `linear-gradient(to right, #2DD4BF ${progress}%, #4B5563 ${progress}%)`
          }}
          aria-label="Seek slider"
        />
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onPlayPause} className="text-white hover:text-teal-400 transition-colors" aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onMuteToggle} className="text-white hover:text-teal-400 transition-colors" aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted || volume === 0 ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-gray-500/50 rounded-lg appearance-none cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button onClick={onFullscreen} className="text-white hover:text-teal-400 transition-colors" aria-label="Fullscreen">
            <ExpandIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoControls;
