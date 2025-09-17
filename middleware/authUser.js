const { getUser } = require("../models/AuthorizedUser");

async function authUser(req, res, next) {
  try {
    const chatId = req.headers["chatid"]; 
    if (!chatId) {
      return res.status(400).json({ success: false, error: "chatId header kerak" });
    }

    const user = await getUser(chatId);

    if (!user) {
      return res.status(401).json({ success: false, error: "User topilmadi yoki avtorizatsiya qilinmagan" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = authUser;
