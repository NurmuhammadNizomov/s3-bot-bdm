const pool = require("../config/db");

async function initTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS authorized_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chatId BIGINT NOT NULL UNIQUE,
      username VARCHAR(100),
      folders TEXT
    )
  `;
  await pool.execute(sql);
}

async function addUser(chatId, username, folders = []) {
  await initTable();
  const [result] = await pool.execute(
    "INSERT INTO authorized_users (chatId, username, folders) VALUES (?, ?, ?)",
    [chatId, username, JSON.stringify(folders)]
  );
  return result.insertId;
}

async function getUser(chatId) {
  await initTable();
  const [rows] = await pool.execute(
    "SELECT * FROM authorized_users WHERE chatId = ?",
    [chatId]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    folders: rows[0].folders ? JSON.parse(rows[0].folders) : [],
  };
}

async function getAllUsers() {
  await initTable();
  const [rows] = await pool.execute("SELECT * FROM authorized_users");
  return rows.map((row) => ({
    ...row,
    folders: row.folders ? JSON.parse(row.folders) : [],
  }));
}

async function updateUserFolders(chatId, folders) {
  await initTable();
  await pool.execute(
    "UPDATE authorized_users SET folders = ? WHERE chatId = ?",
    [JSON.stringify(folders), chatId]
  );
}

module.exports = { initTable, addUser, getUser, getAllUsers, updateUserFolders };
