const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = require("node-fetch");           // ← добавьте
const OpenAI = require("openai");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY не задан");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// URL вашего Google Doc в виде plain-text
const PROMPT_URL =
  "https://docs.google.com/document/d/1l3Xurs93HU9WlS6fKxyvBZFkRIjCdxgd9ktsuf5HSrI/export?format=txt";

// Кэшируем, чтобы не тянуть каждый раз
let cachedSystemPrompt = null;
async function loadSystemPrompt() {
  //if (cachedSystemPrompt) return cachedSystemPrompt;
  const res = await fetch(PROMPT_URL);
  if (!res.ok) throw new Error("Не удалось загрузить промт из Google Doc");
  //cachedSystemPrompt = await res.text();
  return cachedSystemPrompt;
}

// In-memory сессии (можно заменить на Redis/БД)
const sessions = new Map();

app.post("/chat", async (req, res) => {
  const { sessionId, message, init } = req.body;
  if (!sessionId) return res.status(400).json({ error: "Нет sessionId" });

  // Если новой сессии, инициализируем историю
  if (!sessions.has(sessionId)) {
    const sys = await loadSystemPrompt();
    sessions.set(sessionId, [{ role: "system", content: sys }]);
  }
  const history = sessions.get(sessionId);

  // Если init=true — значит фронтенд только открыл чат, без user-message
  if (!init) {
    if (!message?.trim()) {
      return res.status(400).json({ error: "Пустое сообщение" });
    }
    history.push({ role: "user", content: message });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: history,
      max_tokens: 500,
      temperature: 0.7,
    });
    const reply = completion.choices?.[0]?.message?.content || "";
    history.push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI ошибка:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Сервер запущен на ${PORT}`));
