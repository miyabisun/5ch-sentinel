export function log(msg) {
  const ts = new Date().toLocaleTimeString("ja-JP", { hour12: false });
  console.log(`[${ts}] ${msg}`);
}
