const express = require("express");
const router = express.Router();
const { listFolders, checkBackup, hasSubfolders } = require("../services/s3Check");
const { getUser, updateUserFolders } = require("../models/AuthorizedUser");
const authUser = require("../middleware/authUser"); 

// 📂 S3’dan folderlarni olish (subfolder check bilan)
router.get("/", authUser, async (req, res) => {
  try {
    const prefix = req.query.prefix || "";
    const folders = await listFolders(prefix);
    res.json({
      success: true,
      prefix,
      folders: await Promise.all(
        folders.map(async (f) => ({
          name: f,
          hasSubfolders: await hasSubfolders(f),
        }))
      ),
      selected: req.user.folders,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📦 Userning tanlangan folderlarini olish
router.get("/user", authUser, async (req, res) => {
  res.json({
    success: true,
    folders: req.user.folders,
  });
});

// ➕ Folder qo‘shish
router.post("/add", authUser, async (req, res) => {
  try {
    const { folder } = req.body;
    let folders = req.user.folders;

    if (!folders.includes(folder)) {
      folders.push(folder);
      await updateUserFolders(req.user.chatId, folders);
    }

    res.json({ success: true, folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ➖ Folderni o‘chirish
router.post("/remove", authUser, async (req, res) => {
  try {
    const { folder } = req.body;
    let folders = req.user.folders;

    folders = folders.filter((f) => f !== folder);
    await updateUserFolders(req.user.chatId, folders);

    res.json({ success: true, folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔀 Toggle qilish
router.post("/toggle", authUser, async (req, res) => {
  try {
    const { folder } = req.body;
    let folders = req.user.folders;

    if (folders.includes(folder)) {
      folders = folders.filter((f) => f !== folder);
    } else {
      folders.push(folder);
    }

    await updateUserFolders(req.user.chatId, folders);

    res.json({ success: true, folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🗑 Hamma folderlarni tozalash
router.delete("/clear", authUser, async (req, res) => {
  try {
    await updateUserFolders(req.user.chatId, []);
    res.json({ success: true, folders: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📦 Tanlangan folderlar bo‘yicha backup status
router.get("/status", authUser, async (req, res) => {
  try {
    if (!req.user.folders || req.user.folders.length === 0) {
      return res.json({ success: true, status: "❌ Siz hali papka tanlamagansiz!" });
    }

    const results = [];
    for (let f of req.user.folders) {
      results.push(await checkBackup(f));
    }

    res.json({ success: true, status: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
