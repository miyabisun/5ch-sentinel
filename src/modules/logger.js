import singleLineLogModule from "single-line-log";

const singleLineLog = singleLineLogModule.stdout;

export function log(msg) {
  singleLineLog.clear();
  const ts = new Date().toLocaleTimeString("ja-JP", { hour12: false });
  console.log(`[${ts}] ${msg}`);
}

export function clearStatusLine() {
  singleLineLog.clear();
}
