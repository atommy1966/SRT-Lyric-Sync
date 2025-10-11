# SRT Subtitle Sync

[Español](./README.es.md) | [日本語](./README.ja.md) | [简体中文](./README.zh-CN.md)

Upload an audio or a video with audio and provide the SRT, VTT, LRC, or full text to automatically generate a synchronized SRT, VTT, or LRC subtitle file using AI.

![SRT Subtitle Sync - Main Interface](https://github.com/atommy1966/SRT-Subtitle-Sync-assets/blob/main/2025-09-16%2021.25.20.png)
![SRT Subtitle Sync - Editor View](https://github.com/atommy1966/SRT-Subtitle-Sync-assets/blob/main/2025-09-16%2021.33.08.png)

## ✨ Features

*   **AI-Powered Transcription & Sync**:
    *   **One-Click Transcription**: Don't have the text? Let the AI transcribe the audio for you directly into the editor and generate synchronized subtitles in a single step.
    *   **Automatic Synchronization**: If you already have the text, just paste it in and let the AI create a perfectly synchronized subtitle file in seconds.
*   **Multilingual Interface**: Enjoy a fully localized experience with support for English, Japanese, Spanish, and Chinese.
*   **One-Click Translation**: Instantly translate your subtitles into multiple languages using the integrated AI translation tool. Perfect for reaching a global audience.
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
    *   **Smart Filename Generation**: The app automatically detects the language of your subtitles and includes the language code (e.g., `_ja.srt`) in the downloaded filename for easy organization.
    *   **Paste-to-Parse**: Paste raw SRT, VTT, or LRC content directly into the text area, and the app will automatically detect the format and offer to load it into the editor with one click.
    *   **Draft Autosave & Restore**: Your progress is automatically saved in your browser. If you leave and come back, the app will offer to restore your unsaved draft.

## 🎬 Use Cases

This app isn't just for syncing song lyrics. Its high-precision AI transcription and editing features can streamline your workflow in various scenarios:

*   **Music Videos & Live Performances**: Create perfectly synced subtitles for fans to enjoy.
*   **Tutorials & Explainer Videos**: Add clear captions to instructional videos to improve viewer comprehension.
*   **Interviews & Podcasts**: Quickly transcribe recorded interviews to significantly speed up article writing and content editing.
*   **Lectures & Seminars**: Convert online lectures or seminars into text for meeting minutes or study materials.
*   **Language Learning**: Transcribe foreign language songs or speeches to create powerful materials for listening and shadowing practice.

## 🚀 How to Use

1.  **Upload Video/Audio**: Drag and drop or select your video/audio file.
2.  **Provide Text**: You have three options:
    *   **Transcribe (Recommended)**: Click **Transcribe** to let the AI generate text and timings automatically in one step.
    *   **Paste**: Paste the text directly into the text area.
    *   **Import**: Click **Import** to load text from a `.txt` file or an existing subtitle file (`.srt`, `.vtt`, `.lrc`).
3.  **Generate/Refine**:
    *   If you pasted or imported text, click **Generate** to create the initial timings.
    *   Click **Refine** at any time to use the AI to improve the timing accuracy of your current subtitles.
4.  **Edit**: Use the powerful interactive editor to make any final adjustments.
5.  **Download**: Export your synchronized subtitles in your desired format (SRT, VTT, or LRC).

---

## 🌐 Live Demo

[Try SRT Subtitle Sync Here](https://srt-lyric-sync-369376059789.us-west1.run.app/)

**Note:** The maximum upload size for media files is 15MB.

## 💻 Local Development

This application is designed to get the Gemini API Key from an environment variable (`process.env.API_KEY`), which is automatically handled when deployed in Google AI Studio.

For **local development only**, you need to provide your key manually.

### 1. Create `local_env.js` file
In the project's root directory, create a new file and name it `local_env.js`.

### 2. Set Your API Key
Add the following content to `local_env.js`, replacing `"YOUR_GEMINI_API_KEY_HERE"` with your actual Gemini API key:
```javascript
// FOR LOCAL DEVELOPMENT ONLY
window.process = {
  env: {
    API_KEY: "YOUR_GEMINI_API_KEY_HERE"
  }
};
```

### 3. Link the script in `index.html`
Open `index.html` and add the following line right before the `<script type="importmap">` tag:
```html
<script src="local_env.js"></script>
```

⚠️ **CRITICAL:** This setup is for local testing only. **Do not commit the changes to `index.html` that include this script tag**, and **do not commit the `local_env.js` file**. Pushing these to a public repository will expose your API key.

### 4. Run a Local Server
This project doesn't need a complex build process.
- Open a terminal in the project's root directory.
- Use a simple local server. For example:
  ```bash
  # If you have Python 3
  python -m http.server

  # If you have Node.js and serve
  npx serve .
  ```

### 5. Open in Browser
- Navigate to the local URL shown in your terminal (e.g., `http://localhost:8000`).

---

Powered by Google Gemini.