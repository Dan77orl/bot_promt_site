const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const fetch = require("node-fetch");

const nodemailer = require("nodemailer");



async function sendChatHistoryByEmail(history, email) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const formattedMessages = history.map(
    (msg, i) => `${i + 1}. [${msg.role.toUpperCase()}] ${msg.content}`
  ).join("\n\n");

  await transporter.sendMail({
    from: `"RuWave Бот" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "История чата RuWave",
    text: formattedMessages
  });
}



const PROMPT_URL = "https://docs.google.com/document/d/1l3Xurs93HU9WlS6fKxyvBZFkRIjCdxgd9ktsuf5HSrI/export?format=txt";
let cachedPrompt = null;

async function loadSystemPrompt() {
  if (cachedPrompt) return cachedPrompt;
  const res = await fetch(PROMPT_URL);
  if (!res.ok) throw new Error("Не удалось загрузить prompt из Google Docs");
  cachedPrompt = await res.text();
  return cachedPrompt;
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Ошибка: OPENAI_API_KEY не задан");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Простая in-memory сессия (в реальном проекте лучше использовать Redis или БД)
const sessions = new Map();

app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message?.trim() || !sessionId) {
    return res.status(400).json({ error: "Отсутствует сообщение или sessionId" });
  }

  // Получаем историю диалога
  let history = sessions.get(sessionId);
  if (!history) {
    const systemPrompt = await loadSystemPrompt();
    history = [{ role: "system", content: systemPrompt }];
    sessions.set(sessionId, history);
  }

  history.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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

// 🔧 Прокси-эндпоинт для фронтенда
app.get("/system-prompt", async (req, res) => {
  try {
    const response = await fetch(PROMPT_URL);
    if (!response.ok) throw new Error("Ошибка загрузки документа");
    const text = await response.text();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(text);
  } catch (err) {
    res.status(500).send("Не удалось загрузить prompt");
  }
});

const PORT = process.env.PORT || 3000;

app.post("/email", async (req, res) => {
  const { history, email } = req.body;

  if (!email || !Array.isArray(history)) {
    return res.status(400).json({ error: "Неверные данные" });
  }

  try {
    await sendChatHistoryByEmail(history, email);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Ошибка отправки email:", err);
    res.status(500).json({ error: "Ошибка при отправке письма" });
  }
});


app.listen(PORT, () => console.log(`✅ RuWave сервер запущен на порту ${PORT}`));
