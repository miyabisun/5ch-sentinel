// Each line of subject.txt: <threadId>.dat<>Title (resCount)
const SUBJECT_LINE_RE = /^(\d+)\.dat<>(.+)\((\d+)\)$/;

export function parseSubjectTxt(text) {
  const entries = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(SUBJECT_LINE_RE);
    if (m) {
      entries.push({ threadId: m[1], title: m[2].trim(), resCount: parseInt(m[3], 10) });
    }
  }
  return entries;
}
