const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// URL на экспортированный TXT-документ
const DOC_TXT_URL = "https://docs.google.com/document/d/1l3Xurs93HU9WlS6fKxyvBZFkRIjCdxgd9ktsuf5HSrI/export?format=txt";

// Инициализация OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const sessionId = req.body.sessionId;

  try {
    // Получаем системный промт из Google Docs
    const docRes = await fetch(DOC_TXT_URL);
    const systemPrompt = await docRes.text();

    const messages = [
      { role: "system", content: systemPrompt.trim() },
      { role: "user", content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("Ошибка:", err);
    res.status(500).json({ reply: "❌ Ошибка на сервере" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер работает на порту ${PORT}`);
});
