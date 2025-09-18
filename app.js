require("dotenv").config(); 
const express = require("express");
const { initTable } = require("./models/AuthorizedUser");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "chatId"],
}));

// 📦 middleware
const authUser = require("./middleware/authUser");

// 📂 routes
const foldersRoute = require("./routes/folders");

// ✅ endi hamma /api/folders request’lari oldidan authUser ishlaydi
app.use("/api/folders", authUser, foldersRoute);

// Test route
app.get("/", (req, res) => {
  res.send("🚀 API ishlayapti");
});

const NODE_ENV = process.env.NODE_ENV;

if (process.env.NODE_ENV === "production") {
  app.post(`/bot`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

(async () => {
  try {
    await initTable();
    console.log("✅ authorized_users jadvali tayyor");
  } catch (err) {
    console.error("❌ Jadval yaratishda xatolik:", err);
  }
})();


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Express ${PORT}-portda ishga tushdi`));

// Telegram botni ishga tushiramiz
require("./bot");
