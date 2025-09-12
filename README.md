# SRT Lyric Sync

Upload an audio or a video with audio and provide the SRT, VTT, LRC, or full lyrics to automatically generate a synchronized SRT, VTT, or LRC subtitle file using AI.

## ✨ Features

*   **Automatic Synchronization**: Upload your media file (video or audio) and provide the lyrics to get a perfectly synchronized subtitle file.
*   **Multiple Format Support**: Import lyrics from `.srt`, `.vtt`, and `.lrc` files, or simply paste the raw text.
*   **AI-Powered Refinement**: Fine-tune the generated timings with a single click for professional-grade accuracy.
*   **Interactive Editor**: Easily edit timestamps and text, add/remove lines, merge, split, and reorder subtitles with a user-friendly interface.
*   **Real-time Preview**: See your subtitles in action with the integrated video/audio player.
*   **Flexible Export Options**: Download your final work as `.srt`, `.vtt`, or `.lrc` files.
*   **Draft Autosave**: Your progress is automatically saved in your browser, so you can pick up where you left off.

## 🚀 How to Use

1.  **Upload Media**: Drag and drop or select your video/audio file.
2.  **Provide Lyrics**: Paste the lyrics or import an existing subtitle file.
3.  **Generate**: Click the "Generate" button to let the AI create the initial synchronized subtitles.
4.  **Edit & Refine**: Use the powerful editor to make any necessary adjustments. Use the "Refine" button for AI-assisted timing improvements.
5.  **Download**: Export your synchronized subtitles in your desired format.

---

## 🌐 Live Demo

[Try SRT Lyric Sync in AI Studio](https://ai.studio/apps/drive/1Ip8QTAlYMcVD3vXfjPqTSroORKYCJLhG)

## 💻 Local Development

This application is designed to get the Gemini API Key from an environment variable (`process.env.API_KEY`), which is automatically handled when deployed in Google AI Studio.

For **local development only**, you will need to provide the key manually.

### 1. Set Your API Key (Local Workaround)
Because this is a simple static project without a build process, you must temporarily edit `services/geminiService.ts` to insert your key.

- **Open:** `services/geminiService.ts`
- **Find the line:** `const API_KEY = process.env.API_KEY;`
- **Replace it with your key:** `const API_KEY = "YOUR_GEMINI_API_KEY_HERE";`

⚠️ **CRITICAL:** This is for local testing only. **Do not commit this change** or push it to a public repository, as it will expose your API key.

### 2. Run a Local Server
This project doesn't need a complex build process.
- Open a terminal in the project's root directory.
- Use a simple local server. For example:
  ```bash
  # If you have Python 3
  python -m http.server

  # If you have Node.js and serve
  npx serve .
  ```

### 3. Open in Browser
- Navigate to the local URL shown in your terminal (e.g., `http://localhost:8000`).

---

Powered by Google Gemini.