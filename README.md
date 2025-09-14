# SRT Lyric Sync

[Español](./README.es.md) | [日本語](./README.ja.md) | [简体中文](./README.zh-CN.md)

Upload an audio or a video with audio and provide the SRT, VTT, LRC, or full lyrics to automatically generate a synchronized SRT, VTT, or LRC subtitle file using AI.

![SRT Lyric Sync - Main Interface](https://raw.githubusercontent.com/atommy1966/SRT-Lyric-Sync-assets/main/2025-09-14%209.32.26.png)
![SRT Lyric Sync - Editor View](https://raw.githubusercontent.com/atommy1966/SRT-Lyric-Sync-assets/main/2025-09-14%209.33.37.png)

## ✨ Features

*   **AI-Powered Transcription & Sync**:
    *   **One-Click Transcription**: Don't have the lyrics? Let the AI transcribe the audio for you directly into the editor and generate synchronized subtitles in a single step.
    *   **Automatic Synchronization**: If you already have lyrics, just paste them in and let the AI create a perfectly synchronized subtitle file in seconds.
*   **High-Precision AI Refinement**: Fine-tune generated timings with a single click. The AI analyzes vocal decay and phrasing for professional-grade accuracy.
*   **Advanced Interactive Editor**:
    *   **One-Click Timestamping**: Click the target icon next to any time field to instantly set it to the video's current playback position.
    *   **Drag & Drop Reordering**: Effortlessly reorder subtitle lines.
    *   **Powerful Right-Click Menu**: Quickly insert new lines, merge with the next line, delete, or move lines up and down.
    *   **On-the-Fly Splitting**: Place your cursor in the text and click the "Split Line" button to instantly break a long line into two, with timings automatically calculated.
    *   **Keyboard Power-Ups**: Use arrow keys in time fields for precise 100ms adjustments (or 1-second jumps with Shift). Play/pause the video with the spacebar when not typing.
    *   **Undo/Redo History**: Never lose an edit. Step backward and forward through your changes with ease.
*   **Global Timing Controls**:
    *   **Global Offset Slider**: Shift all timestamps forward or backward at once to perfectly align the entire subtitle track.
    *   **Vocal Decay Helper**: Add uniform padding to the end of each line to better match the natural fade-out of a singer's voice.
*   **Flexible I/O & Workflow**:
    *   **Real-time Video Preview**: See your edits reflected instantly on the custom video player. The subtitle list automatically scrolls to the currently playing line.
    *   **Multi-Format Support**: Import from `.txt`, `.srt`, `.vtt`, and `.lrc` files. Export your work to SRT, VTT, or LRC with the streamlined download menu.
    *   **Draft Autosave & Restore**: Your progress is automatically saved in your browser. If you leave and come back, the app will offer to restore your unsaved draft.


## 🚀 How to Use

1.  **Upload Media**: Drag and drop or select your video/audio file.
2.  **Provide Lyrics**: You have three options:
    *   **Transcribe (Recommended)**: Click **Transcribe** to let the AI generate lyrics and timings automatically in one step.
    *   **Paste**: Paste the lyrics directly into the text area.
    *   **Import**: Click **Import** to load lyrics from a `.txt` file or an existing subtitle file (`.srt`, `.vtt`, `.lrc`).
3.  **Generate/Refine**:
    *   If you pasted or imported lyrics, click **Generate** to create the initial timings.
    *   Click **Refine** at any time to use the AI to improve the timing accuracy of your current subtitles.
4.  **Edit**: Use the powerful interactive editor to make any final adjustments.
5.  **Download**: Export your synchronized subtitles in your desired format (SRT, VTT, or LRC).

---

## 🌐 Live Demo

[Try SRT Lyric Sync Here](https://srt-lyric-sync-369376059789.us-west1.run.app/)

**Note:** The maximum upload size for media files is 15MB.

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