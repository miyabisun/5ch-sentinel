import { log } from "./logger.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function notifyDiscord(client, channelId, text) {
  let channel;
  try {
    channel = await client.channels.fetch(channelId);
  } catch (err) {
    log(`[通知エラー] チャンネル取得失敗 (${channelId}): ${err.message}`);
    return;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await channel.send(text);
      log(`[通知送信] ${channelId}`);
      return;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        log(`[通知リトライ] ${attempt}/${MAX_RETRIES} ${delay}ms後に再試行: ${err.message}`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        log(`[通知エラー] ${MAX_RETRIES}回失敗: ${err.message}`);
      }
    }
  }
}
