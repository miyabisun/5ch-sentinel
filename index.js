import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits } from "discord.js";

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
  discordClient: null,
  discordChannelId: process.env.DISCORD_CHANNEL_ID,
  resThresholdForSizeCheck: 900,
  resWarningThreshold: 980,
  datSizeWarningKB: 980,
};

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
    console.error("エラー: .env に DISCORD_TOKEN と DISCORD_CHANNEL_ID を設定してください (npm run setup で確認できます)");
    process.exit(1);
  }

  // Discord client setup
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await new Promise((resolve, reject) => {
    client.once("ready", () => {
      log(`Discord 接続完了 (${client.user.tag})`);
      resolve();
    });
    client.once("error", reject);
    client.login(process.env.DISCORD_TOKEN).catch(reject);
  });

  config.discordClient = client;

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
    client.destroy();
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(`起動失敗: ${err.message}`);
  process.exit(1);
});
