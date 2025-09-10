import React, { useState, useEffect, useRef } from 'react';
import { SrtEntryData, serializeSrt, srtToVtt } from '../utils/srtUtils';

interface VideoPreviewProps {
  videoFile: File;
  videoUrl: string;
  entries: SrtEntryData[];
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ videoFile, videoUrl, entries }) => {
  const [vttUrl, setVttUrl] = useState<string | null>(null);

  useEffect(() => {
    // Generate a new VTT blob URL whenever the SRT entries change.
    const srtContent = serializeSrt(entries);
    const vttContent = srtToVtt(srtContent);
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const newVttUrl = URL.createObjectURL(blob);
    
    setVttUrl(newVttUrl);

    // Cleanup function to revoke the object URL when the component unmounts
    // or when the entries change, preventing memory leaks.
    return () => {
      URL.revokeObjectURL(newVttUrl);
    };
  }, [entries]);

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      {/* 
        Only render the video element if we have a vttUrl.
        The `key={vttUrl}` is the critical part of this fix. 
        It tells React to treat the video as a completely new element whenever the subtitles change.
        This forces the browser to load the new <track> from scratch, which is the most reliable
        way to ensure subtitles are displayed correctly.
      */}
      {vttUrl && (
        <video
          key={vttUrl}
          controls
          crossOrigin="anonymous"
          className="w-full h-full max-h-full object-contain rounded-lg"
        >
          <source src={videoUrl} type={videoFile.type} />
          <track
            label="Lyrics"
            kind="subtitles"
            srcLang="en"
            src={vttUrl}
            default
          />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

export default VideoPreview;
