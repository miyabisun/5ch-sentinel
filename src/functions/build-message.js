export function buildWarningMessage({ title, url, resCount, datSizeKB, nextThread }) {
  let nextInfo;
  if (nextThread) {
    nextInfo = `${nextThread.title}\n${nextThread.url}`;
  } else {
    nextInfo = "※次スレ候補が見つかりませんでした";
  }

  return (
    `⚠️ **スレッド終了警告**\n` +
    `タイトル: ${title}\n` +
    `URL: ${url}\n` +
    `現在のレス数: ${resCount}\n` +
    `Datサイズ: ${datSizeKB != null ? datSizeKB.toFixed(1) : "不明"}KB\n\n` +
    `⬇️ 次スレ候補:\n${nextInfo}`
  );
}
