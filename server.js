const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const GOOGLE_DOC_URL = "https://docs.google.com/document/d/1l3Xurs93HU9WlS6fKxyvBZFkRIjCdxgd9ktsuf5HSrI/export?format=txt";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sessions = new Map();

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message?.trim() || !sessionId) {
    return res.status(400).json({ error: "Отсутствует сообщение или sessionId" });
  }

  let history = sessions.get(sessionId);

  if (!history) {
    try {
      const promptRes = await fetch(GOOGLE_DOC_URL);
      const systemPrompt = await promptRes.text();

      history = [
        {
          role: "system",
          content: systemPrompt.trim()
        }
      ];
      sessions.set(sessionId, history);
    } catch (err) {
      console.error("Ошибка загрузки промта из Google Docs:", err);
      return res.status(500).json({ error: "Ошибка загрузки системного промта" });
    }
  }

  history.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: history,
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = completion.choices?.[0]?.message?.content || "⚠️ Не получил ответ от GPT";

    history.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error("OpenAI ошибка:", err);
    res.status(500).json({ error: "Ошибка GPT", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер работает на порту ${PORT}`);
});
