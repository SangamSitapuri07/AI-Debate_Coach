/**
 * ============================================================
 * /api/chat — FIXED MODE NAMES
 * ============================================================
 */

const express = require("express");
const { validateDebateInput } = require("../middleware/debateValidator");
const { getSystemPrompt } = require("../utils/prompts");
const { getProvider } = require("../services/aiProvider");

const router = express.Router();

// ✅ FIXED: Match frontend mode names
const VALID_MODES = ["learn", "counter", "evaluate", "battle", "battle-feedback"];

router.post("/", async (req, res) => {
  try {
    const { message, mode, history = [], battleContext } = req.body;

    // Validate message
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Validate mode
    if (!mode || !VALID_MODES.includes(mode)) {
      return res.status(400).json({
        error: `Invalid mode "${mode}". Choose one of: ${VALID_MODES.join(", ")}`,
      });
    }

    // Skip debate validation for battle feedback
    if (mode !== "battle-feedback") {
      const validation = validateDebateInput(message);
      if (!validation.isValid) {
        return res.json({ reply: validation.rejectionMessage, rejected: true });
      }
    }

    // Get system prompt for the mode
    const systemPrompt = getSystemPrompt(mode, battleContext);

    // Build messages array
    const messages = [
      ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message.trim() },
    ];

    // Call AI
    const provider = getProvider();
    console.log(`[Chat] Mode: ${mode} | Provider: ${provider.name}`);
    
    const reply = await provider.chat(systemPrompt, messages);

    res.json({ reply, rejected: false });
  } catch (error) {
    console.error("Chat error:", error.message);

    // Handle specific errors
    if (error.status === 401 || error.message?.toLowerCase().includes("api")) {
      return res.status(401).json({ 
        error: "Invalid API key. Please check your server/.env file." 
      });
    }

    if (error.status === 429 || error.message?.toLowerCase().includes("rate")) {
      return res.status(429).json({ 
        error: "Rate limit exceeded. Please wait a moment." 
      });
    }

    res.status(500).json({ error: error.message || "Server error" });
  }
});

module.exports = router;