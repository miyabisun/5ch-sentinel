import singleLineLogModule from "single-line-log";

const singleLineLog = singleLineLogModule.stdout;

// Full-width characters (CJK etc.) occupy 2 columns in terminal
function displayWidth(str) {
  let w = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    w += cp > 0x7f ? 2 : 1;
  }
  return w;
}

export function renderStatus(activeCount, warnedCount, lastCheck) {
  const timeStr = lastCheck
    ? lastCheck.toLocaleTimeString("ja-JP", { hour12: false })
    : "--:--:--";

  const left = `[監視中: ${activeCount}件] [警告済(完了): ${warnedCount}件]`;
  const right = `[最終チェック: ${timeStr}]`;
  const cols = process.stdout.columns || 80;
  const gap = Math.max(1, cols - displayWidth(left) - displayWidth(right));
  const line = left + " ".repeat(gap) + right;

  singleLineLog(`\x1b[7m${line}\x1b[0m`);
}
