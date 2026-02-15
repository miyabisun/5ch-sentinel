// Supported formats:
//   https://[server].5ch.net/test/read.cgi/[board]/[thread_id]/
//   https://[server].5ch.net/[board]/[thread_id]/  (legacy / short)
const THREAD_URL_RE =
  /https?:\/\/([^.]+)\.5ch\.net\/(?:test\/read\.cgi\/)?([^/]+)\/(\d+)/;

export function parseThreadUrl(url) {
  const m = url.match(THREAD_URL_RE);
  if (!m) return null;
  return { server: m[1], board: m[2], threadId: m[3] };
}
