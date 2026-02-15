import path from "path";
import { fileURLToPath } from "url";

import { initDatabase, getActiveThreads, getWarnedCount } from "./src/modules/database.js";
import { log, clearStatusLine } from "./src/modules/logger.js";
import { renderStatus } from "./src/modules/status.js";
import { runCheck } from "./src/modules/checker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DB_PATH = path.join(__dirname, "sentinel.db");
const CHECK_INTERVAL_MS = 60 * 1000;

const config = {
  userAgent: "Monazilla/1.00 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  discordNotifyBase: "http://localhost:5000/discord/channels",
  resThresholdForSizeCheck: 900,
  resWarningThreshold: 980,
  datSizeWarningKB: 980,
};

function main() {
  const db = initDatabase(DB_PATH);
  let lastCheck = null;

  log("5ch-sentinel 起動");
  log(`DB: ${DB_PATH}`);

  const activeCount = getActiveThreads(db).length;
  const warnedCount = getWarnedCount(db);
  log(`監視対象: ${activeCount}件 / 警告済: ${warnedCount}件`);

  // Initial render
  renderStatus(activeCount, warnedCount, lastCheck);

  // Periodic check
  async function tick() {
    try {
      await runCheck(db, config);
    } catch (err) {
      log(`[致命的エラー] ${err.message}`);
    }
    lastCheck = new Date();

    const currentActive = getActiveThreads(db).length;
    const currentWarned = getWarnedCount(db);
    renderStatus(currentActive, currentWarned, lastCheck);
  }

  // Run immediately, then every interval
  tick();
  setInterval(tick, CHECK_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", () => {
    clearStatusLine();
    log("シャットダウン中...");
    db.close();
    process.exit(0);
  });
}

main();
