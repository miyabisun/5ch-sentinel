import { parseThreadUrl } from "./parse-thread-url.js";

export function groupThreadsByBoard(threads) {
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
  return groups;
}
