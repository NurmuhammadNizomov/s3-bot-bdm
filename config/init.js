const { initTable } = require("../models/AuthorizedUser");

(async () => {
  try {
    await initTable();
    console.log("✅ authorized_users jadvali tayyor");
    process.exit(0); 
  } catch (err) {
    console.error("❌ Jadval yaratishda xatolik:", err);
    process.exit(1);
  }
})();
