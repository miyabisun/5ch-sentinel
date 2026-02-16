import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { Client, Events, GatewayIntentBits } from "discord.js";

import { initDatabase, getActiveCount, getWarnedCount, getDeadCount } from "./src/modules/database.js";
import { formatThreadStat } from "./src/functions/format-thread-stat.js";
import { log } from "./src/modules/logger.js";
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
  resWarningThreshold: 980,
  datSizeWarningKB: 900,
  resDeadThreshold: 1002,
  datSizeDeadKB: 1024,
};

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
    console.error("エラー: .env に DISCORD_TOKEN と DISCORD_CHANNEL_ID を設定してください (npm run setup で確認できます)");
    process.exit(1);
  }

  // Discord client setup
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await new Promise((resolve, reject) => {
    client.once(Events.ClientReady, () => {
      log(`Discord 接続完了 (${client.user.tag})`);
      resolve();
    });
    client.once(Events.Error, reject);
    client.login(process.env.DISCORD_TOKEN).catch(reject);
  });

  config.discordClient = client;

  const db = initDatabase(DB_PATH);

  log("5ch-sentinel 起動");
  log(`DB: ${DB_PATH}`);

  log(`正常: ${getActiveCount(db)}件 / 警告: ${getWarnedCount(db)}件 / 死亡: ${getDeadCount(db)}件`);

  // Periodic check
  async function tick() {
    let stats = [];
    try {
      stats = await runCheck(db, config);
    } catch (err) {
      log(`[致命的エラー] ${err.message}`);
    }
    for (const s of stats) {
      const { header, detail } = formatThreadStat(s, config);
      log(header);
      log(detail);
    }

    log(`正常: ${getActiveCount(db)}件 / 警告: ${getWarnedCount(db)}件 / 死亡: ${getDeadCount(db)}件`);
  }

  // Run immediately, then every interval
  tick();
  setInterval(tick, CHECK_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", () => {
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
