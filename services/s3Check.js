const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  s3ForcePathStyle: true,
});

const S3_BUCKET = process.env.S3_BUCKET;

// 📂 Folder ichidagi narsalarni olish
async function listFolders(prefix = "") {
  let ContinuationToken = undefined;
  const folders = new Set();

  do {
    const params = {
      Bucket: S3_BUCKET,
      Prefix: prefix ? prefix + "/" : "",
      ContinuationToken,
    };

    const data = await s3.listObjectsV2(params).promise();

    if (data.Contents) {
      for (const obj of data.Contents) {
        const key = obj.Key.replace(prefix ? prefix + "/" : "", "");
        const parts = key.split("/");

        if (parts.length > 1 && parts[0]) {
          folders.add((prefix ? prefix + "/" : "") + parts[0]);
        }
      }
    }

    ContinuationToken = data.IsTruncated ? data.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return Array.from(folders).sort();
}

// 🔍 Folder ichida fayl bormi yoki subfolderlarmi
async function hasSubfolders(folder) {
  const children = await listFolders(folder);
  return children.length > 0;
}

// 🔍 Bitta folderni tekshirish (fayllar bor-yo‘qligini)
const moment = require("moment-timezone");

async function checkBackup(folder) {
  try {
    const files = await s3
      .listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: `${folder}/`,
      })
      .promise();

    if (files.Contents.length > 0) {
      // eng oxirgi faylni topamiz
      const lastModified = files.Contents
        .map(f => f.LastModified)
        .sort((a, b) => new Date(b) - new Date(a))[0];

      const formattedDate = moment(lastModified)
        .tz("Asia/Tashkent")
        .format("YYYY-MM-DD HH:mm:ss");

      return `✅ ${folder} - ${files.Contents.length} ta fayl (oxirgi: ${formattedDate})`;
    } else {
      return `❌ ${folder} - backup olinmagan`;
    }
  } catch (err) {
    return `⚠️ ${folder} - xatolik: ${err.message}`;
  }
}

module.exports = { listFolders, checkBackup, hasSubfolders };
