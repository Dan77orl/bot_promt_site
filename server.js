const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// URL на опубликованный Google Docs
const GOOGLE_DOC_URL = "https://docs.google.com/document/d/e/2PACX-1vSvkiilfUZ4WwEDgN5gIod_Q5Q419x7B_pUGxV8TLuGIEi7_KF-f52ynJz3DWfl4ZvOWS1ryUqj-Tdu/pub";

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const response = await fetch(GOOGLE_DOC_URL);
    const html = await response.text();

    // Извлекаем только содержимое <body> и убираем HTML-теги
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : "⚠️ Не удалось загрузить приветствие.";

    const cleanText = bodyContent
      .replace(/<[^>]+>/g, "")         // удаляет все HTML-теги
      .replace(/\s+/g, " ")            // убирает лишние пробелы и переносы
      .trim();                         // обрезает пробелы по краям

    res.json({ reply: cleanText });
  } catch (err) {
    console.error("Ошибка загрузки из Google Docs:", err);
    res.status(500).json({ reply: "❌ Ошибка загрузки приветствия с Google Docs." });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
