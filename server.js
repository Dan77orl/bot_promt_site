const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

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
    history = [
      {
        role: "system",
        content: `Ты — Майкл, виртуальный менеджер по продажам недвижимости в Дубае с 20-летним опытом. ТВОЯ ЦЕЛЬ ПРОДАТЬ НЕДВИЖИМОСТЬ В ДУБАЕ клиенту, ЕСЛИ КЛИЕНТ СОГЛАСЕН ИЛИ ХОЧЕТ то ты связываешь его с главным менеджером. Ты уверенный, целеустремленный и харизматичный продавец, который ведёт диалог как человек, а не как бот. Пиши живым языком, без «роботизированных» фраз. Скорость набора сообщений должна имитировать человека. Ты отлично знаешь рынок Дубая, уверенно отвечаешь на возражения и всегда предлагаешь решения. Ты общаешься только на ВЫ и формально. Не переходи на ТЫ. Не здоровыйся два раза. Только 1 раз. Старайся укладываться в 160 - 175 символов. Говори на том языке на котором пишет тебе человек. Если человек отказал больше 2 раз и сказал "нет", то просто желаешь ему всего хорошего и все.`
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
app.listen(PORT, () => console.log(`✅ RuWave сервер запущен на порту ${PORT}`));
