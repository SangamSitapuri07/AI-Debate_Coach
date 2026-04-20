const { GroqProvider } = require("./groqProvider");
const { GeminiProvider } = require("./geminiProvider");

let instance = null;

function getProvider() {
  if (instance) return instance;

  const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();

  if (provider === "groq") {
    const key = process.env.GROQ_API_KEY;
    if (!key || key.includes("PASTE_YOUR") || key.length < 20) {
      throw new Error("GROQ_API_KEY not set. Get it from https://console.groq.com/keys");
    }
    instance = new GroqProvider(key, process.env.GROQ_MODEL || "llama-3.3-70b-versatile");
  } else if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes("PASTE_YOUR") || key.length < 20) {
      throw new Error("GEMINI_API_KEY not set. Get it from https://aistudio.google.com/app/apikey");
    }
    instance = new GeminiProvider(key, process.env.GEMINI_MODEL || "gemini-2.0-flash");
  } else {
    throw new Error(`Unknown provider: ${provider}. Use 'groq' or 'gemini'.`);
  }

  return instance;
}

module.exports = { getProvider };