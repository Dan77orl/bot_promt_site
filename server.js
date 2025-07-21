const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const fetch = require("node-fetch"); // ВАЖНО: node-fetch@2

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Ошибка: OPENAI_API_KEY не задан");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Простая in-memory сессия (лучше заменить на Redis/БД в реальных проектах)
const sessions = new Map();

// ✅ Загружаем system prompt из Google Docs
async function loadPromptFromGoogleDoc() {
  try {
    const url =
      "https://docs.google.com/document/d/e/2PACX-1vSvkiilfUZ4WwEDgN5gIod_Q5Q419x7B_pUGxV8TLuGIEi7_KF-f52ynJz3DWfl4ZvOWS1ryUqj-Tdu/pub";

    const res = await fetch(url);
    const html = await res.text();

    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!match) {
      console.error("❌ Не найден <body> в HTML");
      return "";
    }

    const plainText = match[1]
      .replace(/<[^>]+>/g, "") // Удаляем HTML-теги
      .replace(/\s+/g, " ")    // Удаляем лишние пробелы
      .trim();

    return plainText;
  } catch (err) {
    console.error("❌ Ошибка загрузки Google Docs:", err.message);
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
    const systemPrompt = await loadPromptFromGoogleDoc();
    console.log("📥 PROMPT:", systemPrompt);

    history = [
      {
        role: "system",
        content:
          systemPrompt ||
          "Ты — виртуальный ассистент. Если не загрузился prompt, используй эту фразу."
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

    const reply = completion.choices?.[0]?.message?.content || "⚠️ Ответ от GPT не получен";

    history.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error("OpenAI ошибка:", err);
    res.status(500).json({ error: "Ошибка GPT", detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ RuWave сервер запущен на порту ${PORT}`));
