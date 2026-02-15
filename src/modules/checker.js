import iconv from "iconv-lite";

import { parseThreadUrl } from "../functions/parse-thread-url.js";
import { parseSubjectTxt } from "../functions/parse-subject.js";
import { findNextThread } from "../functions/find-next-thread.js";
import { buildWarningMessage } from "../functions/build-message.js";
import { getActiveThreads, markWarned, updateTitle } from "./database.js";
import { fetchBuffer, headContentLength } from "./http.js";
import { notifyDiscord } from "./discord.js";
import { log } from "./logger.js";

// In-memory store for volatile per-thread data (resCount, datSizeKB)
const threadStats = new Map();

async function checkThread(db, thread, subjectEntries, config) {
  const parsed = parseThreadUrl(thread.url);
  if (!parsed) {
    log(`[エラー] URL解析失敗: ${thread.url}`);
    return;
  }

  const { server, board, threadId } = parsed;

  // Find this thread in subject.txt
  const entry = subjectEntries.find((e) => e.threadId === threadId);
  if (!entry) {
    log(`[情報] スレッド未発見 (dat落ち?): ID=${thread.id} ${thread.url}`);
    return;
  }

  // Update title in DB if not set or changed
  if (!thread.title || thread.title !== entry.title) {
    updateTitle(db, thread.id, entry.title);
    thread.title = entry.title;
  }

  const resCount = entry.resCount;

  // Update in-memory stats
  const stats = threadStats.get(thread.id) || {};
  stats.resCount = resCount;

  // Size check (only when res > threshold)
  let datSizeKB = null;
  if (resCount > config.resThresholdForSizeCheck) {
    try {
      const datUrl = `https://${server}.5ch.net/${board}/dat/${threadId}.dat`;
      const bytes = await headContentLength(datUrl, config.userAgent);
      if (bytes !== null) {
        datSizeKB = bytes / 1024;
        stats.datSizeKB = datSizeKB;
      }
    } catch (err) {
      log(`[警告] datサイズ取得失敗: ID=${thread.id} ${err.message}`);
    }
  }

  threadStats.set(thread.id, stats);

  // Warning conditions
  const resWarning = resCount >= config.resWarningThreshold;
  const sizeWarning = datSizeKB !== null && datSizeKB >= config.datSizeWarningKB;

  if (!resWarning && !sizeWarning) return;

  log(
    `[警告検知] ID=${thread.id} "${thread.title}" ` +
      `レス数=${resCount} datサイズ=${datSizeKB !== null ? datSizeKB.toFixed(1) + "KB" : "N/A"}`
  );

  // Search for next thread
  const next = findNextThread(thread.title, subjectEntries);
  if (next) {
    log(`[次スレ発見] ${next.title}`);
  } else {
    log(`[次スレ未発見] ID=${thread.id}`);
  }

  // Build notification content
  const nextThread = next
    ? {
        title: next.title,
        url: `https://${server}.5ch.net/test/read.cgi/${board}/${next.threadId}/`,
      }
    : null;

  const content = buildWarningMessage({
    title: thread.title,
    url: thread.url,
    resCount,
    datSizeKB,
    nextThread,
  });

  await notifyDiscord(config.discordNotifyBase, "5ch-alert", content);

  // Mark as warned
  markWarned(db, thread.id);
  threadStats.delete(thread.id);
}

export async function runCheck(db, config) {
  const threads = getActiveThreads(db);
  if (threads.length === 0) return;

  // Group threads by server+board to avoid fetching subject.txt multiple times
  const groups = new Map();
  for (const thread of threads) {
    const parsed = parseThreadUrl(thread.url);
    if (!parsed) continue;
    const key = `${parsed.server}/${parsed.board}`;
    if (!groups.has(key)) {
      groups.set(key, { server: parsed.server, board: parsed.board, threads: [] });
    }
    groups.get(key).threads.push(thread);
  }

  for (const [, group] of groups) {
    const subjectUrl = `https://${group.server}.5ch.net/${group.board}/subject.txt`;
    let subjectEntries;
    try {
      const buf = await fetchBuffer(subjectUrl, config.userAgent);
      const text = iconv.decode(buf, "Shift_JIS");
      subjectEntries = parseSubjectTxt(text);
    } catch (err) {
      log(`[エラー] subject.txt取得失敗: ${subjectUrl} - ${err.message}`);
      continue;
    }

    for (const thread of group.threads) {
      try {
        await checkThread(db, thread, subjectEntries, config);
      } catch (err) {
        log(`[エラー] チェック失敗 ID=${thread.id}: ${err.message}`);
      }
    }
  }
}
