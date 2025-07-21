const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// URL на экспорт текста из Google Docs
const DOC_TXT_URL = "https://docs.google.com/document/d/1l3Xurs93HU9WlS6fKxyvBZFkRIjCdxgd9ktsuf5HSrI/export?format=txt";

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const response = await fetch(DOC_TXT_URL);
    const cleanText = await response.text();

    res.json({ reply: cleanText.trim() });
  } catch (err) {
    console.error("Ошибка загрузки из Google Docs:", err);
    res.status(500).json({ reply: "❌ Ошибка загрузки приветствия с Google Docs." });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
