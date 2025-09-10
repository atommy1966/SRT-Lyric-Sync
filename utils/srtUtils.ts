export interface SrtEntryData {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

/**
 * Normalizes a timestamp string to the strict HH:MM:SS,mmm format.
 * Handles variations like MM:SS,mmm or SS,mmm and fixes incorrect separators.
 * @param timestamp The raw timestamp string from any source.
 * @returns A strictly formatted timestamp string.
 */
export const normalizeTimestamp = (timestamp: string): string => {
    // Handle null/undefined or empty strings gracefully
    if (!timestamp || typeof timestamp !== 'string') {
        return '00:00:00,000';
    }

    // 1. Ensure comma separator for milliseconds
    let correctedTimestamp = timestamp.trim().replace(/[.:](\d{3})$/, ',$1');

    // 2. Split into time and milliseconds
    const parts = correctedTimestamp.split(',');
    let timePart = parts[0];
    let msPart = parts.length > 1 ? parts[1] : '000';

    // Handle cases where there are no milliseconds (e.g., "00:00:12")
    if (parts.length === 1 && timePart.match(/^((\d{1,2}:)?\d{1,2}:)?\d{1,2}$/)) {
        msPart = '000';
    } else if (parts.length !== 2) {
        console.warn(`Unexpected timestamp format: "${timestamp}". Defaulting to 00:00:00,000.`);
        return '00:00:00,000';
    }
    
    // 3. Split time into H, M, S
    const timeSegments = timePart.split(':');

    // 4. Pad time segments to HH:MM:SS
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
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (isNaN(index) || !timeMatch) continue;
    
    const startTime = timeMatch[1];
    const endTime = timeMatch[2];
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
      // Ensure all line breaks are CRLF for better compatibility.
      const textWithCrlf = entry.text.replace(/\r?\n/g, '\r\n');
      return `${index}\r\n${entry.startTime} --> ${entry.endTime}\r\n${textWithCrlf}`;
    })
    .join('\r\n\r\n');
};

/**
 * Converts an SRT format string to a WebVTT format string.
 * @param srtContent The string content of the .srt file.
 * @returns A string in WebVTT format.
 */
export const srtToVtt = (srtContent: string): string => {
  if (!srtContent) return 'WEBVTT';

  // Basic VTT header
  let vtt = 'WEBVTT\n\n';

  // Replace SRT's comma decimal separator with a period for VTT
  const vttContent = srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  // Split into blocks and remove SRT numeric indices
  const blocks = vttContent.trim().split(/\r?\n\s*\r?\n/);
  
  const processedBlocks = blocks.map(block => {
    const lines = block.split(/\r?\n/);
    if (lines.length > 1 && lines[0].match(/^\d+$/)) {
      // This is a standard SRT block with an index, remove the index.
      return lines.slice(1).join('\n');
    }
    // If it doesn't look like a standard block (e.g., no index), return as is.
    return block;
  });
  
  vtt += processedBlocks.join('\n\n');

  return vtt;
};