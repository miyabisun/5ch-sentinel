import path from "path";
import { fileURLToPath } from "url";
import iconv from "iconv-lite";

import { initDatabase } from "./src/modules/database.js";
import { parseThreadUrl } from "./src/functions/parse-thread-url.js";
import { parseSubjectTxt } from "./src/functions/parse-subject.js";
import { fetchBuffer } from "./src/modules/http.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "sentinel.db");
const USER_AGENT =
  "Monazilla/1.00 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

const url = process.argv[2];

if (!url) {
  console.error("使い方: node add.js <スレッドURL>");
  process.exit(1);
}

const parsed = parseThreadUrl(url);
if (!parsed) {
  console.error("エラー: 5ch のスレッド URL として認識できません");
  console.error("例: https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/");
  process.exit(1);
}

const db = initDatabase(DB_PATH);

const existing = db
  .prepare("SELECT id FROM threads WHERE url = ? AND deleted_at IS NULL")
  .get(url);

if (existing) {
  console.error(`エラー: この URL は既に登録済みです (ID=${existing.id})`);
  db.close();
  process.exit(1);
}

// Fetch title from subject.txt (retry up to 2 times)
const MAX_RETRIES = 2;
const subjectUrl = `https://${parsed.server}.5ch.net/${parsed.board}/subject.txt`;
let title = null;

for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    const buf = await fetchBuffer(subjectUrl, USER_AGENT);
    const text = iconv.decode(buf, "Shift_JIS");
    const entries = parseSubjectTxt(text);
    const entry = entries.find((e) => e.threadId === parsed.threadId);
    if (entry) {
      title = entry.title;
    }
    break;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.error(`subject.txt 取得失敗、リトライします (${attempt + 1}/${MAX_RETRIES})`);
    } else {
      console.error(`エラー: subject.txt の取得に失敗しました: ${err.message}`);
      db.close();
      process.exit(1);
    }
  }
}

if (!title) {
  console.error("エラー: subject.txt にスレッドが見つかりません (dat落ち?)");
  db.close();
  process.exit(1);
}

const result = db
  .prepare("INSERT INTO threads (url, title, status) VALUES (?, ?, 'active')")
  .run(url, title);

console.log(`登録完了: ID=${result.lastInsertRowid} ${title} ${url}`);
db.close();
