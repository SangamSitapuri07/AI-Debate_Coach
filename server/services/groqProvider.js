const Groq = require("groq-sdk");

class GroqProvider {
  constructor(apiKey, model) {
    this.name = "Groq";
    this.model = model;
    this.client = new Groq({ apiKey });
  }

  async chat(systemPrompt, messages) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 2048,
    });
    return completion.choices[0]?.message?.content || "";
  }
}

module.exports = { GroqProvider };