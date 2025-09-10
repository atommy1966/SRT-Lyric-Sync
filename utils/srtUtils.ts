export interface SrtEntryData {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

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