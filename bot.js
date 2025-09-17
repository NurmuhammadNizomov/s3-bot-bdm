const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const { checkBackup, listFolders, hasSubfolders } = require("./services/s3Check");
const { getUser, addUser, getAllUsers, updateUserFolders } = require("./models/AuthorizedUser");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const userState = new Map();

// keyboard generatsiya qilish
async function generateKeyboard(user, path = "", page = 0) {
  const all = await listFolders(path);
  const pageSize = 5;
  const start = page * pageSize;
  const items = all.slice(start, start + pageSize);

  const rows = await Promise.all(
    items.map(async (f) => {
      const isSelected = user.folders.includes(f);
      const subs = await hasSubfolders(f);
      return [
        {
          text: subs ? `📁 ${f}` : (isSelected ? `✅ ${f}` : `❌ ${f}`),
          callback_data: subs ? `open:${f}:0` : `toggle:${f}`,
        },
      ];
    })
  );

  const navRow = [];
  if (page > 0) navRow.push({ text: "⬅️ Oldingi", callback_data: `page:${path}:${page - 1}` });
  if (start + pageSize < all.length) navRow.push({ text: "➡️ Keyingi", callback_data: `page:${path}:${page + 1}` });

  if (navRow.length) rows.push(navRow);
  if (path) rows.push([{ text: "🔙 Orqaga", callback_data: `back:${path}` }]);

  return { inline_keyboard: rows };
}

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let user = await getUser(chatId);

  if (!user) {
    return bot.sendMessage(chatId, "🔑 Parolni yuboring:");
  }

  userState.set(chatId, { currentPath: "", page: 0 });
  const keyboard = await generateKeyboard(user, "", 0);
  bot.sendMessage(chatId, "📂 Papkani tanlang:", { reply_markup: keyboard });
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

  userState.set(chatId, { currentPath: "", page: 0 });
  const keyboard = await generateKeyboard(user, "", 0);
  bot.sendMessage(chatId, "📂 Papkani tanlang:", { reply_markup: keyboard });
});

// Inline button handler
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  let user = await getUser(chatId);
  if (!user) return;

  const data = query.data;
  let { currentPath, page } = userState.get(chatId) || { currentPath: "", page: 0 };

  if (data.startsWith("toggle:")) {
    const folder = data.split(":")[1];
    if (user.folders.includes(folder)) {
      user.folders = user.folders.filter((f) => f !== folder);
    } else {
      user.folders.push(folder);
    }
    await updateUserFolders(chatId, user.folders);
  }

  if (data.startsWith("open:")) {
    const parts = data.split(":");
    currentPath = parts[1];
    page = parseInt(parts[2]);
  }

  if (data.startsWith("page:")) {
    const parts = data.split(":");
    currentPath = parts[1];
    page = parseInt(parts[2]);
  }

  if (data.startsWith("back:")) {
    const parts = data.split(":");
    currentPath = parts[1].split("/").slice(0, -1).join("/");
    page = 0;
  }

  userState.set(chatId, { currentPath, page });
  const keyboard = await generateKeyboard(user, currentPath, page);

  bot.editMessageReplyMarkup(keyboard, {
    chat_id: chatId,
    message_id: query.message.message_id,
  });
});

// 📦 Manual tekshirish
bot.onText(/\/check/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  if (!user) return bot.sendMessage(chatId, "⛔ Siz avtorizatsiya qilmagansiz!");
  if (!user.folders || user.folders.length === 0) {
    return bot.sendMessage(chatId, "❌ Siz hali papka tanlamagansiz!");
  }

  let message = "📦 Siz tanlagan papkalar:\n\n";
  for (let f of user.folders) {
    message += await checkBackup(f);
    message += "\n";
  }
  bot.sendMessage(chatId, message);
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
