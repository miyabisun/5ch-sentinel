import iconv from "iconv-lite";

import { parseSubjectTxt } from "../functions/parse-subject.js";
import { parseThreadUrl } from "../functions/parse-thread-url.js";
import { findNextThread } from "../functions/find-next-thread.js";
import { buildWarningMessage } from "../functions/build-message.js";
import { groupThreadsByBoard } from "../functions/group-threads-by-board.js";
import { getActiveThreads, setStatus, updateTitle, addThread, softDelete } from "./database.js";
import { fetchBuffer, headContentLength } from "./http.js";
import { notifyDiscord } from "./discord.js";
import { log } from "./logger.js";

// Track previous resCount per thread to avoid unnecessary HEAD requests.
// On first check (no prev entry), HEAD always runs — catching dat-gone at startup.
const prevStats = new Map();

async function notifyAndSetStatus(db, thread, config, { server, board, subjectEntries, resCount, datSizeKB, status, dead, datGone = false }) {
  const next = thread.title ? findNextThread(thread.title, subjectEntries) : null;
  let nextThread = null;
  if (next) {
    const nextUrl = `https://${server}.5ch.net/test/read.cgi/${board}/${next.threadId}/`;
    const newId = addThread(db, nextUrl, next.title);
    if (newId) {
      log(`[世代交代] ID=${thread.id} → ID=${newId} ${next.title}`);
      softDelete(db, thread.id);
    } else {
      log(`[次スレ発見] ${next.title} (登録済み)`);
    }
    nextThread = { title: next.title, url: nextUrl };
  } else {
    log(`[次スレ未発見] ID=${thread.id}`);
  }

  const content = buildWarningMessage({
    title: thread.title || thread.url,
    url: thread.url,
    resCount,
    datSizeKB,
    nextThread,
    dead,
    datGone,
  });

  await notifyDiscord(config.discordClient, config.discordChannelId, content);
  setStatus(db, thread.id, status);

  if (status === "dead") {
    prevStats.delete(thread.id);
  }
}

async function fetchDatSize(server, board, threadId, userAgent) {
  const datUrl = `https://${server}.5ch.net/${board}/dat/${threadId}.dat`;
  const bytes = await headContentLength(datUrl, userAgent);
  return bytes !== null ? bytes / 1024 : null;
}

async function checkThread(db, thread, subjectEntries, config) {
  const parsed = parseThreadUrl(thread.url);
  if (!parsed) {
    log(`[エラー] URL解析失敗: ${thread.url}`);
    return null;
  }

  const { server, board, threadId } = parsed;

  // Find this thread in subject.txt
  const entry = subjectEntries.find((e) => e.threadId === threadId);
  if (!entry) {
    log(`[終了検知] dat落ち: ID=${thread.id} "${thread.title}"`);

    await notifyAndSetStatus(db, thread, config, {
      server,
      board,
      subjectEntries,
      resCount: null,
      datSizeKB: null,
      status: "dead",
      dead: true,
    });

    return { id: thread.id, title: thread.title, resCount: null, datSizeKB: null, dead: true };
  }

  // Update title in DB if not set or changed
  if (!thread.title || thread.title !== entry.title) {
    updateTitle(db, thread.id, entry.title);
    thread.title = entry.title;
  }

  const resCount = entry.resCount;
  const prev = prevStats.get(thread.id);

  // Check dat size when resCount increased or on first check (no prev entry).
  // First check always runs HEAD — this catches dat-gone even at startup.
  let datSizeKB = prev?.datSizeKB ?? null;
  let datGone = false;
  if (!prev || resCount > prev.resCount) {
    try {
      const size = await fetchDatSize(server, board, threadId, config.userAgent);
      if (size !== null) datSizeKB = size;
    } catch (err) {
      if (err.httpStatus === 404) datGone = true;
      log(`[警告] datサイズ取得失敗: ID=${thread.id} ${err.message}`);
    }
  }

  prevStats.set(thread.id, { resCount, datSizeKB });
  const stat = { id: thread.id, title: thread.title, resCount, datSizeKB, dead: false };

  // Dead conditions (checked for both active and warned)
  const resDead = resCount >= config.resDeadThreshold;
  const sizeDead = datSizeKB !== null && datSizeKB >= config.datSizeDeadKB;

  if (resDead || sizeDead || datGone) {
    log(
      `[終了検知] ID=${thread.id} "${thread.title}" ` +
        `レス数=${resCount} datサイズ=${datGone ? "dat消失" : datSizeKB !== null ? datSizeKB.toFixed(1) + "KB" : "N/A"}`
    );

    await notifyAndSetStatus(db, thread, config, {
      server,
      board,
      subjectEntries,
      resCount,
      datSizeKB,
      status: "dead",
      dead: true,
      datGone,
    });

    stat.dead = true;
    return stat;
  }

  // Warning conditions (only for active threads)
  if (thread.status === "active") {
    const resWarning = resCount >= config.resWarningThreshold;
    const sizeWarning = datSizeKB !== null && datSizeKB >= config.datSizeWarningKB;

    if (resWarning || sizeWarning) {
      log(
        `[警告検知] ID=${thread.id} "${thread.title}" ` +
          `レス数=${resCount} datサイズ=${datSizeKB !== null ? datSizeKB.toFixed(1) + "KB" : "N/A"}`
      );

      await notifyAndSetStatus(db, thread, config, {
        server,
        board,
        subjectEntries,
        resCount,
        datSizeKB,
        status: "warned",
        dead: false,
      });
    }
  }

  return stat;
}

export async function runCheck(db, config) {
  const threads = getActiveThreads(db);
  if (threads.length === 0) return [];

  // Clean stale prevStats entries (e.g. manually deleted threads)
  const activeIds = new Set(threads.map((t) => t.id));
  for (const id of prevStats.keys()) {
    if (!activeIds.has(id)) prevStats.delete(id);
  }

  const stats = [];
  const groups = groupThreadsByBoard(threads);

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
        const stat = await checkThread(db, thread, subjectEntries, config);
        if (stat) stats.push(stat);
      } catch (err) {
        log(`[エラー] チェック失敗 ID=${thread.id}: ${err.message}`);
      }
    }
  }

  return stats;
}
