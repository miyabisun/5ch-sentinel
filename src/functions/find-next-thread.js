function extractNumberPositions(title) {
  return [...title.matchAll(/\d+/g)].map((m) => ({
    raw: m[0],
    num: parseInt(m[0], 10),
    index: m.index,
  }));
}

function buildContextMatcher(title, position) {
  const prefix = title.slice(0, position.index);
  const suffix = title.slice(position.index + position.raw.length);
  const prefixFragment = prefix.slice(-Math.min(prefix.length, 6));
  const suffixFragment = suffix.slice(0, Math.min(suffix.length, 6));

  if (prefixFragment === "" && suffixFragment === "") return null;

  return (candidate) =>
    (prefixFragment === "" || candidate.includes(prefixFragment)) &&
    (suffixFragment === "" || candidate.includes(suffixFragment));
}

export function findNextThread(currentTitle, subjectEntries) {
  const positions = extractNumberPositions(currentTitle);
  if (positions.length === 0) return null;

  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    const matchesContext = buildContextMatcher(currentTitle, pos);
    if (!matchesContext) continue;

    const nextStr = String(pos.num + 1);
    const found = subjectEntries.find((e) => matchesContext(e.title) && e.title.includes(nextStr));
    if (found) return found;

    const padded = nextStr.padStart(pos.raw.length, "0");
    if (padded !== nextStr) {
      const found = subjectEntries.find((e) => matchesContext(e.title) && e.title.includes(padded));
      if (found) return found;
    }
  }

  return null;
}
