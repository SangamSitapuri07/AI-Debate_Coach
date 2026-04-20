require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app = express();

// ═══════════════════════════════════════════════════════════════
// CORS — allows local dev + Netlify production
// ═══════════════════════════════════════════════════════════════

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, mobile apps)
    if (!origin) return callback(null, true);

    const allowed = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:4173",
      /\.netlify\.app$/,
      /\.netlify\.com$/,
      /\.vercel\.app$/,
      /\.onrender\.com$/,
    ];

    const isAllowed = allowed.some((p) =>
      typeof p === "string" ? p === origin : p.test(origin)
    );

    // Allow all for now — tighten after you get your Netlify URL
    callback(null, true);
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

const PORT        = process.env.PORT || 3001;
const AI_PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();

// ═══════════════════════════════════════════════════════════════
// AI CLIENT
// ═══════════════════════════════════════════════════════════════

let groqClient   = null;
let geminiClient = null;

if (AI_PROVIDER === "groq") {
  const Groq = require("groq-sdk");
  groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log("✅ Groq ready");
} else {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("✅ Gemini ready");
}

async function callAI(systemPrompt, userMessage, history = [], maxTokens = 2048) {
  if (AI_PROVIDER === "groq") {
    const completion = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });
    return completion.choices[0]?.message?.content || "";
  } else {
    const model = geminiClient.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });
    const gemHistory = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const chat   = model.startChat({ history: gemHistory });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  }
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

function quickReject(text) {
  const t = text.toLowerCase().trim();
  if (t.length < 4) return "Too short";
  if (/^(hi|hello|hey|yo|sup|hola|howdy)[\s!?.]*$/i.test(t))
    return "That's a greeting, not a debate topic";
  if (/^\d+\s*[\+\-\*\/]\s*\d+/.test(t))
    return "That's math, not a debate topic";
  if (/^(ok|yes|no|test|asdf|lol|hmm|bye|thanks|okay|sure|fine|cool|nice)[\s!?.]*$/i.test(t))
    return "Please provide a debate topic or argument";
  if (/^(elaborate|go deeper|tell me more|explain more|expand on this|more detail|continue|go on)[\s!?.]*$/i.test(t))
    return "That's a request, not a debate argument";
  if (/^(write me an essay|give me an essay|write an essay|compose an essay)/i.test(t))
    return "That's an essay request, not a debate topic";
  if (/^(what are you|who are you|are you an ai|why are you acting|are you a bot)/i.test(t))
    return "That's a question about me, not a debate topic";
  if (/^(elaborate (it|this|that|why|how)|explain (it|this|that) (deeper|more|in detail|further))/i.test(t))
    return "That's a request to elaborate, not a debate argument";
  return null;
}

function isLikelyDebateTopic(text) {
  const t = text.toLowerCase().trim();
  const signals = [
    "should", "ought", "must", "need to", "have to",
    "better", "worse", "more", "less", "greater",
    "harmful", "beneficial", "dangerous", "safe",
    "good", "bad", "right", "wrong",
    "ethical", "unethical", "fair", "unfair",
    "free", "ban", "allow", "regulate", "legalize", "abolish",
    "mandatory", "optional", "required", "prohibited",
    "priority", "important", "essential", "necessary",
    "critical", "vital", "significant", "serious", "urgent",
    "social media", "artificial intelligence", " ai ",
    "climate", "global warming", "university", "education",
    "remote work", "office work", "technology", "government",
    "society", "economy", "environment", "health", "mental health",
    "students", "workers", "children", "people", "citizens",
    "internet", "vaccine", "nuclear", "war", "peace",
    "democracy", "freedom", "rights", "equality", "justice",
    "immigration", "tax", "death penalty", "abortion",
    "privacy", "surveillance", "censorship", "media",
    "poverty", "wealth", "minimum wage", "welfare",
    "because", "therefore", "argue", "believe", "think",
    "claim", "evidence", "proves", "shows", "demonstrates",
    "however", "although", "despite", "whereas",
    "support", "oppose", "agree", "disagree",
    "advantage", "disadvantage", "benefit", "drawback",
    "pros", "cons", "impact", "effect", "consequence",
  ];
  for (const s of signals) { if (t.includes(s)) return true; }
  if (t.split(" ").length >= 5) return true;
  if (t.includes("?") && t.length > 8) return true;
  return false;
}

async function isDebateInput(message) {
  const prompt = `Is this a valid debate topic or argument? Be GENEROUS.

VALID = any opinion or position on a real issue people can argue about.
INVALID ONLY IF = greeting, math, essay request, gibberish, question about AI.

"Should AI be regulated?" → VALID
"Climate change is the top priority" → VALID
"Social media does more harm than good" → VALID
"University education should be free" → VALID
"hi" → INVALID
"write an essay" → INVALID

INPUT: "${message}"

ONE WORD ONLY: VALID or INVALID`;

  try {
    const r = await callAI(prompt, message, [], 10);
    return !r.trim().toUpperCase().includes("INVALID");
  } catch {
    return true;
  }
}

function getRejectionMessage(mode, reason) {
  const guide = {
    learn:    'Try: "Should homework be banned?" or "Social media harms teenagers"',
    counter:  'Try: "Homework helps students because it reinforces learning"',
    evaluate: 'Try: "Universities should be free because education is a human right"',
  };
  return `🚫 **${reason}**\n\n${guide[mode] || "Please provide a debate topic or argument."}`;
}

// ═══════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════

function getPrompt(mode, ctx = {}) {
  const COACH = `You are an AI Debate Coach. You ONLY help with debate arguments and topics.

STRICT RULES:
1. Only evaluate, generate, or counter debate arguments
2. If user sends casual chat, questions about you, or requests to elaborate/explain, respond ONLY with:
   "🚫 Please provide a debate argument or topic."
3. Do NOT explain yourself or have conversations
4. Do NOT respond to "elaborate", "explain more", "go deeper", "tell me more"
5. Use Markdown formatting`;

  switch (mode) {
    case "learn":
      return `${COACH}

MODE: Argument Generator
Generate arguments for BOTH sides of the given debate topic.

## ✅ Arguments FOR
### 1. [Title]
- **Claim:** [one sentence]
- **Reasoning:** [2-3 sentences]
- **Evidence:** [real example or data]
- **Impact:** [why it matters]
### 2. [Title]
[same structure]
### 3. [Title]
[same structure]
---
## ❌ Arguments AGAINST
### 1. [Title]
[same structure]
### 2. [Title]
[same structure]
### 3. [Title]
[same structure]
---
## 💡 Strategic Tips
- [Tip 1]
- [Tip 2]`;

    case "counter":
      return `${COACH}

MODE: Counterargument Builder
Build a counterargument against the given debate argument.

## 📋 Original Argument
[summarize]
## 🔍 Weaknesses Found
- **[Weakness 1]:** [explanation]
- **[Weakness 2]:** [explanation]
## ⚔️ Counterargument
- **Claim:** [counter]
- **Reasoning:** [logic]
- **Evidence:** [data]
- **Impact:** [why it wins]
## 🎯 Delivery Tips
[advice]`;

    case "evaluate":
      return `${COACH}

MODE: Argument Evaluator
Evaluate and score the given debate argument.
If input is "elaborate", "explain more", etc. — reject it.

## 📊 Evaluation Scorecard
| Criteria | Score | Feedback |
|----------|:-----:|----------|
| Clarity | X/10 | [specific] |
| Logic | X/10 | [specific] |
| Evidence | X/10 | [specific] |
| Impact | X/10 | [specific] |
| Persuasiveness | X/10 | [specific] |
| **Overall** | **X/10** | **[summary]** |

## 💪 Strengths
- [strength]
- [strength]
## 📉 Weaknesses
- [weakness]
- [weakness]
## 📈 How to Improve
- [suggestion]
- [suggestion]
## ✨ Stronger Version
[rewrite stronger]`;

    case "battle":
      return `You are a skilled debate opponent in a live debate battle.

DEBATE: "${ctx.topic}"
You argue: ${ctx.aiSide} | Round: ${ctx.round}/${ctx.totalRounds}

VALID = debate argument about "${ctx.topic}" with reasoning.
INVALID = greetings, essay requests, explanation requests, off-topic.

For INVALID:
- Greetings → "👋 We're debating! Argue: ${ctx.topic}"
- Essay request → "🚫 I debate — I don't write essays! Argue: ${ctx.topic}"
- Explanation → "🚫 I debate — I don't explain! Position on: ${ctx.topic}?"
- Off-topic → "🚫 Stay on: ${ctx.topic}. What's your argument?"

For VALID arguments:

## 🔥 Rebuttal
[Attack their specific point — quote what they said]

## ⚔️ My Argument
[Your counter with evidence — 3-4 sentences]

## ❓ Challenge
[One question they must answer]`;

    case "battle-feedback":
      return `You are an expert debate judge. Analyze the completed debate.

DEBATE: "${ctx.topic}"
Human: ${ctx.userSide} | AI: ${ctx.aiSide} | Rounds: ${ctx.totalRounds}

Read every message. Quote specific things. Give honest scores — NOT generic 7/10.

## 🏆 Winner
**[Human/AI/Tie]**
[2-3 sentences WHY — reference specific arguments]

---

## 📊 Detailed Scores
| Category | Score | Specific Feedback |
|----------|:-----:|-------------------|
| Opening Argument | X/10 | [quote round 1] |
| Argument Strength | X/10 | [evidence or opinions?] |
| Rebuttal Quality | X/10 | [did they counter AI?] |
| Evidence & Examples | X/10 | [what evidence?] |
| Adaptability | X/10 | [improve over rounds?] |
| Persuasiveness | X/10 | [convincing?] |
| **Overall** | **X/10** | **[honest summary]** |

---

## 💬 Round-by-Round Analysis
### Round 1
**Human:** [quote] | **Good:** [what worked] | **Weak:** [what didn't]
### Round 2
**Human:** [quote] | **Addressed AI?** [yes/no] | **Progress:** [better/worse/same]
[all rounds...]

---

## 💪 Top 3 Strengths
1. [specific with quote]
2. [specific with quote]
3. [specific with quote]

## 📉 Top 3 Weaknesses
1. [what to do instead]
2. [better alternative]
3. [how to fix]

---

## 💡 Stronger Version of Weakest Argument
**Original:** "[quote weakest]"
**Improved:** "[rewrite stronger]"

## 🏅 Final Rating
**Level:** [Beginner/Intermediate/Advanced/Expert]
**Summary:** [one honest sentence]`;

    default:
      return COACH;
  }
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", provider: AI_PROVIDER });
});

app.post("/api/validate-topic", async (req, res) => {
  const { topic } = req.body;
  if (!topic?.trim()) {
    return res.json({ isValid: false, message: "Enter a topic" });
  }
  const fast = quickReject(topic.trim());
  if (fast) return res.json({ isValid: false, message: fast });
  if (isLikelyDebateTopic(topic.trim())) {
    return res.json({ isValid: true, topic: topic.trim() });
  }
  const valid = await isDebateInput(topic.trim());
  if (!valid) {
    return res.json({
      isValid: false,
      message: "Not a debate topic. Enter something people can argue about!",
    });
  }
  res.json({ isValid: true, topic: topic.trim() });
});

app.post("/api/chat", async (req, res) => {
  const { message, mode, history = [], battleContext = {} } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message required" });

  const validModes = ["learn", "counter", "evaluate", "battle", "battle-feedback"];
  if (!validModes.includes(mode)) return res.status(400).json({ error: "Invalid mode" });

  const topic = battleContext.topic || "the debate topic";
  const m     = message.toLowerCase().trim();

  console.log(`\n💬 [${mode}] "${message.substring(0, 60)}..."`);

  // ── Battle mode ──
  if (mode === "battle") {
    if (/^(hi|hello|hey|yo|sup|hola)[\s!?.]*$/i.test(m)) {
      return res.json({
        reply: `👋 Hi! We're in a debate battle.\n\n**Topic:** ${topic}\n\nPresent your opening argument!`,
        rejected: false,
      });
    }
    if (/\b(write|compose|draft|create)\b.{0,20}\b(essay|paragraph|article|text)\b/i.test(m)) {
      return res.json({
        reply: `🚫 **I'm your debate opponent — not an essay writer!**\n\nWe're debating: **${topic}**\n\nTake a side and argue it!`,
        rejected: false,
      });
    }
    if (/^(explain|elaborate|tell me|describe|what is|how does|write about|expand|go deeper|tell me more|explain more)/i.test(m)) {
      return res.json({
        reply: `🚫 **I debate — I don't explain!**\n\nWe're debating: **${topic}**\n\nState your position and argue it!`,
        rejected: false,
      });
    }
    const wc = m.split(/\s+/).length;
    const hasDebateWord = ["because","therefore","argue","believe","think","claim","evidence","shows","however","although","since","should","must","harm","benefit","support","oppose","agree","disagree"].some((k) => m.includes(k));
    if (wc < 4 && !hasDebateWord) {
      return res.json({
        reply: `🚫 **That's not a debate argument!**\n\nWe're debating: **${topic}**\n\nExample:\n> *"I believe ${topic} because..."*`,
        rejected: false,
      });
    }
    try {
      const prompt   = getPrompt(mode, battleContext);
      const histMsgs = history.slice(-20).map((msg) => ({ role: msg.role, content: msg.content }));
      const reply    = await callAI(prompt, message, histMsgs, 2048);
      return res.json({ reply, rejected: false });
    } catch (error) {
      console.error("   ❌", error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  // ── Battle feedback ──
  if (mode === "battle-feedback") {
    try {
      const prompt   = getPrompt(mode, battleContext);
      const histMsgs = history.slice(-20).map((msg) => ({ role: msg.role, content: msg.content }));
      const reply    = await callAI(prompt, message, histMsgs, 4096);
      return res.json({ reply, rejected: false });
    } catch (error) {
      console.error("   ❌", error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  // ── Learn / Counter / Evaluate ──
  const fastResult = quickReject(message);
  if (fastResult) {
    console.log(`   🚫 Quick reject: ${fastResult}`);
    return res.json({ reply: getRejectionMessage(mode, fastResult), rejected: true });
  }

  if (isLikelyDebateTopic(message)) {
    console.log("   ✅ Debate keywords — accepted");
  } else {
    console.log("   🔍 Checking with AI...");
    const valid = await isDebateInput(message);
    if (!valid) {
      console.log("   🚫 AI rejected");
      return res.json({
        reply: getRejectionMessage(mode, "That doesn't look like a debate topic or argument"),
        rejected: true,
      });
    }
    console.log("   ✅ AI accepted");
  }

  try {
    const prompt   = getPrompt(mode, battleContext);
    const histMsgs = history.slice(-20).map((msg) => ({ role: msg.role, content: msg.content }));
    console.log("   🤖 Calling AI...");
    const reply = await callAI(prompt, message, histMsgs, 2048);
    console.log(`   ✅ Done (${reply.length} chars)`);
    return res.json({ reply, rejected: false });
  } catch (error) {
    console.error("   ❌", error.message);
    if (error.status === 401) return res.status(401).json({ error: "Invalid API key" });
    if (error.status === 429) return res.status(429).json({ error: "Rate limit. Wait and retry." });
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🎓 Debate Coach @ http://localhost:${PORT}\n`);
});