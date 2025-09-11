import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { SrtEntryData, timestampToMs } from '../utils/srtUtils';
import CustomVideoControls from './CustomVideoControls';

interface VideoPreviewProps {
  videoFile: File;
  videoUrl: string;
  entries: SrtEntryData[];
  onTimeUpdate: (time: number) => void;
}

const VideoPreview = forwardRef<HTMLVideoElement, VideoPreviewProps>(({ videoFile, videoUrl, entries, onTimeUpdate }, ref) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<TextTrack | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isTrackReady, setIsTrackReady] = useState(false);

  useImperativeHandle(ref, () => localVideoRef.current as HTMLVideoElement);
  
  // This effect sets up the text track when the video is loaded or the source changes.
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    setIsTrackReady(false); // Reset on new video

    const setupTrack = () => {
      // Ensure we don't add multiple tracks
      let track = Array.from(video.textTracks).find(t => t.label === 'Live Subtitles');
      if (!track) {
        track = video.addTextTrack('subtitles', 'Live Subtitles', 'en');
      }
      track.mode = 'showing';
      trackRef.current = track;
      setIsTrackReady(true); // Signal readiness
    };
    
    if (video.readyState >= 1) { // HAVE_METADATA
      setupTrack();
    } else {
      video.addEventListener('loadedmetadata', setupTrack, { once: true });
    }
    
    setVolume(video.volume);
    setIsMuted(video.muted);

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', setupTrack);
      setIsTrackReady(false);
    };
    return cleanup;
  }, [videoUrl]);

  // Update subtitles whenever entries change OR when the track becomes ready
  useEffect(() => {
    if (!isTrackReady) return; // Guard against running before track is set up

    const track = trackRef.current;
    if (!track) return;
    
    if (track.cues) {
      while (track.cues.length > 0) {
        track.removeCue(track.cues[0]!);
      }
    }

    entries.forEach(entry => {
      const startTime = timestampToMs(entry.startTime) / 1000;
      const endTime = timestampToMs(entry.endTime) / 1000;
      
      if (startTime < endTime) {
        const cue = new VTTCue(startTime, endTime, entry.text);
        
        // Position subtitles reliably above the controls by aligning the bottom of the cue.
        cue.line = 90; // Position at 90% from the top.
        cue.lineAlign = 'end'; // Align the bottom of the cue box to the line position.
        cue.position = 50; // Center horizontally.
        cue.align = 'center'; // Align text within the cue box to the center.
        cue.size = 80; // Use 80% of video width.
        
        track.addCue(cue);
      }
    });
  }, [entries, isTrackReady]);

  // Handlers for Custom Controls
  const handlePlayPause = () => {
    const video = localVideoRef.current;
    if (video) {
      video.paused ? video.play() : video.pause();
    }
  };

  const handleSeek = (time: number) => {
    const video = localVideoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = localVideoRef.current;
    if (video) {
      video.muted = false;
      video.volume = newVolume;
    }
  };

  const handleMuteToggle = () => {
    const video = localVideoRef.current;
    if (video) {
      video.muted = !video.muted;
    }
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
          alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };
  
  // Video Event Listeners
  const handleTimeUpdateEvent = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime;
    setCurrentTime(time);
    onTimeUpdate(time); // Propagate to parent
  };
  
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setDuration(e.currentTarget.duration);
  };
  
  const handleVolumeChangeOnVideo = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setVolume(e.currentTarget.volume);
    setIsMuted(e.currentTarget.muted);
  };

  // Controls Visibility Logic
  const showControls = () => {
    if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
    }
    setAreControlsVisible(true);
    controlsTimeoutRef.current = window.setTimeout(() => {
        if (!localVideoRef.current?.paused) {
            setAreControlsVisible(false);
        }
    }, 3000);
  };
  
  const handleContainerClick = () => {
    handlePlayPause();
  };

  useEffect(() => {
    const container = containerRef.current;
    const video = localVideoRef.current;
    const handleMouseLeave = () => {
        if (video && !video.paused) {
          setAreControlsVisible(false);
        }
    };
    if (container) {
      container.addEventListener('mousemove', showControls);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', showControls);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative bg-black group" onClick={handleContainerClick}>
      <video
        ref={localVideoRef}
        crossOrigin="anonymous"
        className="w-full h-full max-h-full max-w-full object-contain"
        onTimeUpdate={handleTimeUpdateEvent}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => {setIsPlaying(true); showControls();}}
        onPause={() => {setIsPlaying(false); setAreControlsVisible(true);}}
        onVolumeChange={handleVolumeChangeOnVideo}
        key={videoUrl}
      >
        <source src={videoUrl} type={videoFile.type} />
        Your browser does not support the video tag.
      </video>
      <CustomVideoControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        onFullscreen={handleFullscreen}
        isVisible={areControlsVisible}
      />
    </div>
  );
});

VideoPreview.displayName = 'VideoPreview';

export default VideoPreview;