const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const { checkBackup } = require("./services/s3Check");
const { getUser, addUser, getAllUsers } = require("./models/AuthorizedUser");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
let bot;

if (NODE_ENV === "production") {
  bot = new TelegramBot(BOT_TOKEN, { webHook: true });
  bot.setWebHook(`${WEBHOOK_URL}`);
  console.log("✅ Bot webhook rejimida ishlayapti:", WEBHOOK_URL);
} else {
  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  console.log("✅ Bot polling rejimida ishlayapti");
}

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await getUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId, "🔑 Parolni yuboring:");
  }
});

// parolni tekshirish
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  let user = await getUser(chatId);

  if (!user) {
    if (text === ADMIN_PASSWORD) {
      await addUser(chatId, msg.from.username || msg.from.first_name, []);
      user = await getUser(chatId);
      bot.sendMessage(chatId, "✅ Muvaffaqiyatli avtorizatsiya qildingiz!");
    } else return;
  }
});

// ⏰ Cron (05:00 va 09:00)
cron.schedule("0 5,9 * * *", async () => {
  const users = await getAllUsers();
  for (let u of users) {
    if (!u.folders || u.folders.length === 0) continue;
    const grouped = {};
    for (let f of u.folders) {
      const root = f.split("/")[0]; 
      if (!grouped[root]) grouped[root] = [];
      grouped[root].push(f);
    }
    for (const root in grouped) {
      let message = `📦 Backup status: ${root}\n\n`;
      for (let f of grouped[root]) {
        message += await checkBackup(f);
        message += "\n";
      }
      await bot.sendMessage(u.chatId, message);
    }
  }
}, { timezone: "Asia/Tashkent" });

module.exports = bot;
