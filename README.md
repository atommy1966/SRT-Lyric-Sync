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

[Try SRT Lyric Sync in AI Studio](https://aistudio.google.com/app/YOUR_APP_ID_HERE)
*(Replace `YOUR_APP_ID_HERE` with your actual application link)*

## 💻 Local Development

To run this application on your local machine, follow these steps.

### 1. Set your API Key
The application needs a Google Gemini API Key to function.

- Open the `services/geminiService.ts` file.
- Find the line `const API_KEY = process.env.API_KEY;`
- Replace it with your actual key like this: `const API_KEY = "YOUR_GEMINI_API_KEY_HERE";`

**Important:** Do not commit this change if you are using a public repository.

### 2. Run a Local Server
This project is a simple static site and doesn't need a complex build process.

- Open a terminal in the project's root directory.
- If you have Python 3, run the command:
  ```bash
  python -m http.server
  ```
- Alternatively, if you have Node.js, you can use the `serve` package:
  ```bash
  npx serve .
  ```

### 3. Open in Browser
Navigate to the local URL shown in your terminal (e.g., `http://localhost:8000` or `http://localhost:3000`).

---

Powered by Google Gemini.
