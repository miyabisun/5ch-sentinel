export function buildWarningMessage({ title, url, resCount, datSizeKB, nextThread, dead = false }) {
  let nextInfo;
  if (nextThread) {
    nextInfo = `${nextThread.title}\n${nextThread.url}`;
  } else {
    nextInfo = "※次スレ候補が見つかりませんでした";
  }

  const header = dead
    ? `🔴 **スレッド終了通知**`
    : `⚠️ **スレッド終了警告**`;

  const statusLine =
    resCount !== null
      ? `現在のレス数: ${resCount}\nDatサイズ: ${datSizeKB != null ? datSizeKB.toFixed(1) : "不明"}KB`
      : "状態: dat落ち (subject.txt から消失)";

  return (
    `${header}\n` +
    `タイトル: ${title}\n` +
    `URL: ${url}\n` +
    `${statusLine}\n\n` +
    `⬇️ 次スレ候補:\n${nextInfo}`
  );
}
