import Database from "better-sqlite3";

export function initDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      url        TEXT    NOT NULL,
      title      TEXT,
      warned     INTEGER DEFAULT 0,
      deleted_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  return db;
}

export function getActiveThreads(db) {
  return db
    .prepare("SELECT id, url, title FROM threads WHERE deleted_at IS NULL AND warned = 0")
    .all();
}

export function getWarnedCount(db) {
  return db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM threads WHERE deleted_at IS NULL AND warned = 1"
    )
    .get().cnt;
}

export function markWarned(db, id) {
  db.prepare("UPDATE threads SET warned = 1 WHERE id = ?").run(id);
}

export function updateTitle(db, id, title) {
  db.prepare("UPDATE threads SET title = ? WHERE id = ?").run(title, id);
}
