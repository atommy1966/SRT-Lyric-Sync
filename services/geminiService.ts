import { GoogleGenAI, Type } from "@google/genai";
import { SrtEntryData } from "../utils/srtUtils";

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
You are an expert in creating subtitle files. I have provided a video and the full lyrics for the audio in that video.
Your task is to analyze the audio in the video and create a synchronized list of subtitle entries for the provided lyrics.

**Instructions:**
1. Listen carefully to the audio in the video.
2. Match each line of the provided lyrics to the corresponding speech or singing in the audio.
3. Generate timestamps in the **strict** standard SRT format: \`HH:MM:SS,ms\` (Hours:Minutes:Seconds,Milliseconds).
   - **Crucially**, use a comma (,) as the separator before milliseconds.
   - For example, a timestamp for 14 seconds and 249 milliseconds must be formatted as \`00:00:14,249\`. A timestamp for 1 minute, 23 seconds, and 456 milliseconds must be \`00:01:23,456\`.
4. The output must be ONLY a JSON array of objects, without any markdown formatting, extra text, or explanations. Each object represents a subtitle entry and must contain 'index', 'startTime', 'endTime', and 'text' fields.
5. The 'index' should start from 1.

**Lyrics:**
---
${lyrics}
---
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [videoPart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        },
      },
    });
    
    const rawText = response.text;
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
      return result as SrtEntryData[];
    } else {
      console.error("AI response did not match expected schema:", result);
      throw new Error("The AI response was not in the expected format.");
    }

  } catch (error) {
    console.error("Error generating SRT content:", error);
    if (error instanceof Error) {
        // Re-throw with a more user-friendly message
        throw new Error(`Failed to generate subtitles. Details: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating subtitles.");
  }
};