const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiProvider {
  constructor(apiKey, model) {
    this.name = "Gemini";
    this.model = model;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(systemPrompt, messages) {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    if (history.length > 0 && history[0].role === "model") {
      history.unshift({ role: "user", parts: [{ text: "Start" }] });
    }

    const chat = model.startChat({ history });
    const last = messages[messages.length - 1];
    const result = await chat.sendMessage(last.content);
    return result.response.text();
  }
}

module.exports = { GeminiProvider };