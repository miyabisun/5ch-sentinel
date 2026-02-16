import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client, ChannelType, GatewayIntentBits } from "discord.js";
import select from "@inquirer/select";
import input from "@inquirer/input";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, ".env");
const ENV_EXAMPLE_PATH = path.join(__dirname, ".env.example");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
    console.log(".env.example → .env にコピーしました\n");
  }
  return fs.readFileSync(ENV_PATH, "utf-8");
}

function writeEnvValue(env, key, value) {
  const re = new RegExp(`^${key}=.*`, "m");
  if (re.test(env)) {
    return env.replace(re, `${key}=${value}`);
  }
  return env.trimEnd() + `\n${key}=${value}\n`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let env = readEnv();

// 1. Resolve token
let token = env.match(/^DISCORD_TOKEN=(.+)$/m)?.[1]?.trim();

if (!token) {
  token = await input({
    message: "Discord Bot トークンを入力してください",
    validate: (v) => v.length > 0 || "トークンを入力してください",
  });
  env = writeEnvValue(env, "DISCORD_TOKEN", token);
  fs.writeFileSync(ENV_PATH, env);
  console.log(".env に DISCORD_TOKEN を書き込みました\n");
}

// 2. Login
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

try {
  await client.login(token);
  await new Promise((resolve) => client.once("ready", resolve));
} catch (err) {
  console.error(`ログイン失敗: ${err.message}`);
  process.exit(1);
}

console.log(`ログイン成功: ${client.user.tag}\n`);

// 3. Collect text channels
const choices = [];
for (const guild of client.guilds.cache.values()) {
  const channels = guild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildText)
    .sort((a, b) => a.position - b.position);

  for (const ch of channels.values()) {
    const category = ch.parent ? `${ch.parent.name}/` : "";
    choices.push({
      name: `${guild.name} > ${category}#${ch.name}`,
      value: ch.id,
    });
  }
}

if (choices.length === 0) {
  console.error("エラー: Bot が参加しているサーバーにテキストチャンネルがありません");
  client.destroy();
  process.exit(1);
}

// 4. Select channel
try {
  const channelId = await select({
    message: "通知先チャンネルを選択してください",
    choices,
  });

  env = writeEnvValue(env, "DISCORD_CHANNEL_ID", channelId);
  fs.writeFileSync(ENV_PATH, env);
  console.log(`\n.env に DISCORD_CHANNEL_ID=${channelId} を書き込みました`);
} catch {
  // User cancelled (Ctrl+C)
}

client.destroy();
