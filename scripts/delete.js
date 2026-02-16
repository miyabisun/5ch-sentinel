import path from "path";
import { fileURLToPath } from "url";
import select from "@inquirer/select";

import { initDatabase, getActiveThreads, softDelete } from "../src/modules/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "sentinel.db");

const db = initDatabase(DB_PATH);
const threads = getActiveThreads(db);

if (threads.length === 0) {
  console.log("監視中のスレッドがありません。");
  db.close();
  process.exit(0);
}

const statusLabel = { active: "監視中", warned: "警告済" };

try {
  const id = await select({
    message: "削除するスレッドを選択してください",
    choices: threads.map((t) => ({
      name: `[${statusLabel[t.status] ?? t.status}] ${t.title}`,
      value: t.id,
      description: t.url,
    })),
  });

  const deleted = threads.find((t) => t.id === id);
  softDelete(db, id);
  console.log(`削除しました: ${deleted.title}`);
} catch {
  // User cancelled (Ctrl+C)
}

db.close();
