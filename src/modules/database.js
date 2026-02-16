import Database from "better-sqlite3";

const CURRENT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS threads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT    NOT NULL,
    title      TEXT,
    status     TEXT    DEFAULT 'active',
    deleted_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`;

function migrateFromWarned(db) {
  const columns = db.pragma("table_info(threads)");
  const hasWarned = columns.some((c) => c.name === "warned");
  const hasStatus = columns.some((c) => c.name === "status");
  if (!hasWarned || hasStatus) return;

  db.transaction(() => {
    db.exec(`
      CREATE TABLE threads_new (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        url        TEXT    NOT NULL,
        title      TEXT,
        status     TEXT    DEFAULT 'active',
        deleted_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      INSERT INTO threads_new (id, url, title, status, deleted_at, created_at)
        SELECT id, url, title,
               CASE WHEN warned = 1 THEN 'warned' ELSE 'active' END,
               deleted_at, created_at
        FROM threads;
      DROP TABLE threads;
      ALTER TABLE threads_new RENAME TO threads;
    `);
  })();
}

export function initDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(CURRENT_SCHEMA);
  migrateFromWarned(db);
  return db;
}

export function getActiveThreads(db) {
  return db
    .prepare(
      "SELECT id, url, title, status FROM threads WHERE status IN ('active', 'warned') AND deleted_at IS NULL"
    )
    .all();
}

export function getActiveCount(db) {
  return db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM threads WHERE deleted_at IS NULL AND status = 'active'"
    )
    .get().cnt;
}

export function setStatus(db, id, status) {
  db.prepare("UPDATE threads SET status = ? WHERE id = ?").run(status, id);
}

export function getWarnedCount(db) {
  return db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM threads WHERE deleted_at IS NULL AND status = 'warned'"
    )
    .get().cnt;
}

export function getDeadCount(db) {
  return db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM threads WHERE deleted_at IS NULL AND status = 'dead'"
    )
    .get().cnt;
}

export function addThread(db, url, title) {
  const existing = db
    .prepare("SELECT id FROM threads WHERE url = ? AND deleted_at IS NULL")
    .get(url);
  if (existing) return null;
  const result = db
    .prepare("INSERT INTO threads (url, title, status) VALUES (?, ?, 'active')")
    .run(url, title);
  return result.lastInsertRowid;
}

export function softDelete(db, id) {
  db.prepare("UPDATE threads SET deleted_at = strftime('%s', 'now') WHERE id = ?").run(id);
}

export function updateTitle(db, id, title) {
  db.prepare("UPDATE threads SET title = ? WHERE id = ?").run(title, id);
}
