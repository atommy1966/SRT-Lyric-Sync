
import { GoogleGenAI, Type } from "@google/genai";
import { SrtEntryData, normalizeTimestamp } from "../utils/srtUtils";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully,
  // but for this context, throwing an error is fine.
  // The environment is expected to have the API_KEY.
  console.error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Extracts a JSON string from a text that might contain markdown fences or other text.
 * @param text The text from the AI response.
 * @returns A cleaned string that is hopefully valid JSON.
 */
const extractJson = (text: string): string => {
    // Look for a JSON block marked with ```json
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1];
    }

    // If no markdown block, try to find the outermost array brackets
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        return text.substring(firstBracket, lastBracket + 1);
    }
    
    // As a last resort, just trim the string
    return text.trim();
};

const srtDataSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        index: {
          type: Type.INTEGER,
          description: 'The sequential index of the subtitle, starting from 1.',
        },
        startTime: {
          type: Type.STRING,
          description: 'The start timestamp in HH:MM:SS,ms format.',
        },
        endTime: {
          type: Type.STRING,
          description: 'The end timestamp in HH:MM:SS,ms format.',
        },
        text: {
          type: Type.STRING,
          description: 'The subtitle text for this entry.',
        },
      },
      required: ["index", "startTime", "endTime", "text"],
    },
};

const processAiResponse = (rawText: string): SrtEntryData[] => {
    if (!rawText) {
        throw new Error("The AI returned an empty response.");
    }

    const cleanedJsonString = extractJson(rawText);
    let result: any;
    try {
        result = JSON.parse(cleanedJsonString);
    } catch (parseError) {
        console.error("Failed to parse cleaned JSON:", cleanedJsonString);
        throw new Error("The AI returned data in a format that could not be read.");
    }
    

    // Validate if the result is an array of SrtEntryData
    if (Array.isArray(result) && result.every(item => 
        typeof item.index === 'number' &&
        typeof item.startTime === 'string' &&
        typeof item.endTime === 'string' &&
        typeof item.text === 'string'
    )) {
       // Ensure the array is not empty
       if (result.length === 0) {
        throw new Error("The AI returned an empty list of subtitles.");
      }
      
      // Normalize timestamps to the strict HH:MM:SS,mmm format.
      const normalizedResult = result.map(item => ({
            ...item,
            startTime: normalizeTimestamp(item.startTime),
            endTime: normalizeTimestamp(item.endTime),
      }));

      return normalizedResult as SrtEntryData[];
    } else {
      console.error("AI response did not match expected schema:", result);
      throw new Error("The AI response was not in the expected format.");
    }
}


export const generateSrtFromVideoAndLyrics = async (
  videoBase64: string,
  mimeType: string,
  lyrics: string
): Promise<SrtEntryData[]> => {
  try {
    const videoPart = {
      inlineData: {
        data: videoBase64,
        mimeType: mimeType,
      },
    };

    const prompt = `
You are a subtitle generation expert. Your task is to synchronize the provided lyrics with the audio from the video.
Return a JSON array where each object represents a subtitle line.

**JSON Object Structure:**
- \`index\`: Sequential number, starting at 1.
- \`startTime\`: Start timestamp in \`HH:MM:SS,ms\` format (e.g., \`00:01:23,456\`). **Crucially, use a comma (,) before the milliseconds.**
- \`endTime\`: End timestamp in \`HH:MM:SS,ms\` format (e.g., \`00:01:25,789\`). **Crucially, use a comma (,) before the milliseconds.**
- \`text\`: The line of lyric text.

**Important Rules:**
1.  Analyze the video's audio to find the precise start and end times for each line of the provided lyrics.
2.  Make a best-effort guess for timings if a perfect match is not possible. Do not leave any lyric line out.
3.  The final output must be ONLY the JSON array. Do not include any other text or markdown.

**Lyrics to synchronize:**
---
${lyrics}
---
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [videoPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: srtDataSchema,
      },
    });
    
    return processAiResponse(response.text);

  } catch (error) {
    console.error("Error generating SRT content:", error);
    if (error instanceof Error) {
        // Re-throw with a more user-friendly message
        throw new Error(`Failed to generate subtitles. Details: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating subtitles.");
  }
};

export const refineSrtTimings = async (
    videoBase64: string,
    mimeType: string,
    currentEntries: SrtEntryData[]
): Promise<SrtEntryData[]> => {
    try {
        const videoPart = {
            inlineData: {
              data: videoBase64,
              mimeType: mimeType,
            },
        };

        const prompt = `
You are an expert subtitle timing refinement tool.
Your task is to analyze the audio from the provided video and adjust the timings for an existing set of subtitles to be as precise as possible.

**Input:** You will receive a JSON array of subtitle entries.
**Output:** You must return the full, updated list of subtitles in the exact same JSON array format.

**IMPORTANT Rules:**
1.  Adjust the \`startTime\` and \`endTime\` for each entry to perfectly match when the vocals for that line are sung.
2.  **Crucially for \`endTime\`, the timestamp must mark the *very end* of the vocal phrase. This includes sustained notes (long tones), reverberation, and vocal trails. The subtitle should remain visible until the singer's voice for that specific text has completely faded or the next sung line begins.**
3.  DO NOT change the \`text\`, \`index\`, or the order of the entries.
4.  Ensure timestamps are in \`HH:MM:SS,ms\` format. **Use a comma (,) before the milliseconds.**
5.  Your entire response must be ONLY the JSON array. Do not add any extra text, explanations, or markdown formatting.

**Subtitles to refine:**
---
${JSON.stringify(currentEntries, null, 2)}
---
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [videoPart, { text: prompt }] },
            config: {
              responseMimeType: "application/json",
              responseSchema: srtDataSchema,
            },
        });

        const refinedEntries = processAiResponse(response.text);

        // New, more resilient safety check.
        // First, ensure the AI returned the correct number of subtitle lines. This is a critical failure.
        if (refinedEntries.length !== currentEntries.length) {
            console.error("Refinement process failed: AI returned a different number of entries.", { originalCount: currentEntries.length, refinedCount: refinedEntries.length });
            throw new Error("The AI failed to follow instructions and changed the number of subtitle lines. Please try again.");
        }

        // If the line count is correct, merge the refined timings with the original text.
        // This makes the process resilient to small, unintentional text changes by the AI (e.g., punctuation).
        const resilientRefinedEntries = currentEntries.map((originalEntry, i) => {
            const refinedEntry = refinedEntries[i];
            return {
                ...originalEntry, // Keeps original index and text.
                startTime: refinedEntry.startTime, // Uses refined start time (already normalized).
                endTime: refinedEntry.endTime,   // Uses refined end time (already normalized).
            };
        });

        return resilientRefinedEntries;

    } catch (error) {
        console.error("Error refining SRT timings:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to refine timings. Details: ${error.message}`);
        }
        throw new Error("An unknown error occurred while refining timings.");
    }
};