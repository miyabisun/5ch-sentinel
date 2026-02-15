import { log } from "./logger.js";

export async function notifyDiscord(baseUrl, channelName, text) {
  const url = `${baseUrl}/${channelName}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: text,
    });
    if (!res.ok) {
      log(`[通知エラー] ${channelName}: HTTP ${res.status}`);
      return;
    }
    log(`[通知送信] ${channelName}`);
  } catch (err) {
    log(`[通知エラー] ${channelName}: ${err.message}`);
  }
}
