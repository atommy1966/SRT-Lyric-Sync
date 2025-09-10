export interface SrtEntryData {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

/**
 * Normalizes a timestamp string to the strict HH:MM:SS,mmm format.
 * Handles variations with ',', '.', or ':' as millisecond separators.
 * @param timestamp The raw timestamp string from any source.
 * @returns A strictly formatted timestamp string.
 */
export const normalizeTimestamp = (timestamp: string): string => {
    if (!timestamp || typeof timestamp !== 'string') {
        return '00:00:00,000';
    }

    const trimmedTimestamp = timestamp.trim();
    // Use regex to find the time part and an optional ms part with various separators.
    // This regex captures (everything before separator), (the separator), and (the milliseconds).
    const msMatch = trimmedTimestamp.match(/(.*)([.,:])(\d{1,3})$/);
    
    let timePart: string;
    let msPart = '000';

    if (msMatch) {
        // msMatch[1] is the time part, msMatch[3] is the milliseconds.
        timePart = msMatch[1];
        msPart = msMatch[3];
    } else {
        // No separator found, the whole string is the time part.
        timePart = trimmedTimestamp;
    }

    const timeSegments = timePart.split(':').filter(s => s); // filter out empty strings

    let hours = '00', minutes = '00', seconds = '00';

    if (timeSegments.length === 3) { // HH:MM:SS
        [hours, minutes, seconds] = timeSegments;
    } else if (timeSegments.length === 2) { // MM:SS
        [minutes, seconds] = timeSegments;
    } else if (timeSegments.length === 1 && timeSegments[0] !== '') { // SS
        [seconds] = timeSegments;
    }

    const paddedHours = hours.padStart(2, '0');
    const paddedMinutes = minutes.padStart(2, '0');
    const paddedSeconds = seconds.padStart(2, '0');
    const paddedMs = msPart.padEnd(3, '0').substring(0, 3);

    return `${paddedHours}:${paddedMinutes}:${paddedSeconds},${paddedMs}`;
};


/**
 * Converts a HH:MM:SS,mmm timestamp string to total milliseconds.
 * @param timestamp The SRT timestamp string.
 * @returns The total number of milliseconds.
 */
export const timestampToMs = (timestamp: string): number => {
    const normalized = normalizeTimestamp(timestamp);
    const match = normalized.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return 0;
    const [, hours, minutes, seconds, ms] = match;
    return (parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10)) * 1000 + parseInt(ms, 10);
};

/**
 * Converts a total number of milliseconds to a HH:MM:SS,mmm timestamp string.
 * @param totalMs The total number of milliseconds.
 * @returns An SRT timestamp string.
 */
export const msToTimestamp = (totalMs: number): string => {
    if (totalMs < 0) totalMs = 0;
    const ms = Math.floor(totalMs % 1000);
    const totalSeconds = Math.floor(totalMs / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    const paddedMs = String(ms).padStart(3, '0');

    return `${paddedHours}:${paddedMinutes}:${paddedSeconds},${paddedMs}`;
};


export const parseSrt = (srtContent: string): SrtEntryData[] => {
  if (!srtContent) return [];
  const entries: SrtEntryData[] = [];
  // Use a regex that is more robust to different line endings
  const blocks = srtContent.trim().split(/\r?\n\s*\r?\n/);

  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 2) continue; // Allow text to be empty

    const index = parseInt(lines[0], 10);
    const timeMatch = lines[1].match(/(.*?)\s*-->\s*(.*)/);
    
    if (isNaN(index) || !timeMatch) continue;
    
    const startTime = normalizeTimestamp(timeMatch[1]);
    const endTime = normalizeTimestamp(timeMatch[2]);
    const text = lines.slice(2).join('\n');

    entries.push({ index, startTime, endTime, text });
  }
  return entries;
};

export const serializeSrt = (entries: SrtEntryData[]): string => {
  return entries
    .map((entry, i) => {
      // Re-index on serialization to ensure correctness
      const index = i + 1;
      // Normalize timestamps to the app's internal format (HH:MM:SS,mmm).
      const normalizedStartTime = normalizeTimestamp(entry.startTime);
      const normalizedEndTime = normalizeTimestamp(entry.endTime);

      // Timestamps are already in the correct SRT format (HH:MM:SS,mmm)
      const srtStartTime = normalizedStartTime;
      const srtEndTime = normalizedEndTime;
      
      // Ensure all line breaks are CRLF for better compatibility.
      const textWithCrlf = entry.text.replace(/\r?\n/g, '\r\n');
      return `${index}\r\n${srtStartTime} --> ${srtEndTime}\r\n${textWithCrlf}`;
    })
    .join('\r\n\r\n');
};

/**
 * Converts an SRT format string to a WebVTT format string with centered cues.
 * @param srtContent The string content of the .srt file.
 * @returns A string in WebVTT format.
 */
export const srtToVtt = (srtContent: string): string => {
  if (!srtContent) return 'WEBVTT';

  // VTT header
  const vttHeader = 'WEBVTT\n\n';

  // Split SRT into individual subtitle blocks
  const blocks = srtContent.trim().split(/\r?\n\s*\r?\n/);

  const vttBlocks = blocks.map(block => {
    const lines = block.split(/\r?\n/);
    if (lines.length < 2) {
      return ''; // Invalid block
    }

    // Find the timestamp line, which contains "-->"
    const timestampIndex = lines.findIndex(line => line.includes('-->'));
    if (timestampIndex === -1) {
      return ''; // No timestamp found, invalid block
    }

    let timestampLine = lines[timestampIndex];
    // 1. Replace SRT's comma decimal separator with a period for VTT
    timestampLine = timestampLine.replace(/,(\d{3})/g, '.$1');
    // 2. Add positioning settings to center the subtitles and ensure wrapping
    timestampLine += ' line:45% position:50% align:middle size:80%';

    // The text is all lines after the timestamp
    const textLines = lines.slice(timestampIndex + 1);

    // Reconstruct the VTT cue, joining the text lines
    return `${timestampLine}\n${textLines.join('\n')}`;
  }).filter(block => block).join('\n\n'); // Filter out any empty/invalid blocks

  return vttHeader + vttBlocks;
};

/**
 * Converts a total number of milliseconds to a [mm:ss.xx] LRC timestamp string.
 * @param totalMs The total number of milliseconds.
 * @returns An LRC timestamp string.
 */
export const msToLrcTimestamp = (totalMs: number): string => {
    if (totalMs < 0) totalMs = 0;
    
    const totalSeconds = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((totalMs % 1000) / 10);

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    const paddedCentiseconds = String(centiseconds).padStart(2, '0');

    return `[${paddedMinutes}:${paddedSeconds}.${paddedCentiseconds}]`;
};

/**
 * Converts SRT data to LRC format.
 * Each entry becomes a line: [mm:ss.xx]Lyric text
 * @param entries The array of SRT entry data.
 * @returns A string in LRC format.
 */
export const serializeLrc = (entries: SrtEntryData[]): string => {
    return entries
      .map(entry => {
        const timestampMs = timestampToMs(entry.startTime);
        const lrcTimestamp = msToLrcTimestamp(timestampMs);
        // LRC format is typically single-line. Join multi-line text.
        const text = entry.text.replace(/\r?\n/g, ' ');
        return `${lrcTimestamp}${text}`;
      })
      .join('\r\n');
};