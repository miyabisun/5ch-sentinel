export function buildWarningMessage({ title, url, resCount, datSizeKB, nextThread, dead = false, datGone = false }) {
  const nextInfo = nextThread
    ? `\n\n⬇️ 移行先:\n${nextThread.title}\n${nextThread.url}`
    : "";

  const header = dead
    ? `🔴 **スレッド終了通知**`
    : `⚠️ **スレッド終了警告**`;

  const statusLine = datGone
    ? `状態: dat消失 (subject.txt には存在)\n最終レス数: ${resCount}`
    : resCount !== null
      ? `現在のレス数: ${resCount}\nDatサイズ: ${datSizeKB != null ? datSizeKB.toFixed(1) : "不明"}KB`
      : "状態: dat落ち (subject.txt から消失)";

  return (
    `${header}\n` +
    `タイトル: ${title}\n` +
    `URL: ${url}\n` +
    `${statusLine}` +
    nextInfo
  );
}
