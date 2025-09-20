// FOR LOCAL DEVELOPMENT ONLY
// In a deployed environment (like Google AI Studio), process.env.API_KEY is set automatically.
// To run locally, add your Gemini API Key here.
// IMPORTANT: Do not commit this file with your key exposed.
window.process = {
  env: {
    API_KEY: "YOUR_GEMINI_API_KEY_HERE"
  }
};
