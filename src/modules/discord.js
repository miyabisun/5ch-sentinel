import { log } from "./logger.js";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

export async function notifyDiscord(client, channelId, text) {
  let channel;
  try {
    channel = await client.channels.fetch(channelId);
  } catch (err) {
    log(`[通知エラー] チャンネル取得失敗 (${channelId}): ${err.message}`);
    return;
  }

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      await channel.send(text);
      log(`[通知送信] ${channelId}`);
      return;
    } catch (err) {
      if (i < MAX_ATTEMPTS - 1) {
        const delay = BASE_DELAY_MS * 2 ** i;
        log(`[通知リトライ] ${i + 1}/${MAX_ATTEMPTS} ${delay}ms後に再試行: ${err.message}`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        log(`[通知エラー] ${MAX_ATTEMPTS}回失敗: ${err.message}`);
      }
    }
  }
}
