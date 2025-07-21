const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const fetch = require("node-fetch"); // Убедись, что установлен: npm install node-fetch@2

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Ошибка: OPENAI_API_KEY не задан");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Храним историю чатов в памяти
const sessions = new Map();

// Загружаем prompt из опубликованного Google Docs
async function loadPromptFromGoogleDoc() {
  try {
    const res = await fetch("https://docs.google.com/document/d/1l3Xurs93HU9WlS6fKxyvBZFkRIjCdxgd9ktsuf5HSrI/pub?embedded=true");
    const html = await res.text();

    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!match) return "";

    const body = match[1]
      .replace(/<[^>]+>/g, "") // Удалить HTML-теги
      .replace(/\s+/g, " ")    // Убрать лишние пробелы
      .trim();

    return body;
  } catch (err) {
    console.error("❌ Не удалось загрузить prompt из Google Docs:", err);
    return "";
  }
}

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message?.trim() || !sessionId) {
    return res.status(400).json({ error: "Отсутствует сообщение или sessionId" });
  }

  let history = sessions.get(sessionId);
  if (!history) {
    const prompt = await loadPromptFromGoogleDoc();

    history = [
      {
        role: "system",
        content: prompt || "Вы — опытный менеджер по продаже недвижимости в Дубае."
      }
    ];
    sessions.set(sessionId, history);
  }

  history.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
