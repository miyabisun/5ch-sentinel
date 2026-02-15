export function findNextThread(currentTitle, subjectEntries) {
  // Extract numbers from the title and try incrementing each (rightmost first)
  const numberPattern = /\d+/g;
  const matches = [...currentTitle.matchAll(numberPattern)];
  if (matches.length === 0) return null;

  // Try from rightmost number (most likely to be the part number)
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const num = parseInt(match[0], 10);
    const nextNum = num + 1;

    // Build expected title fragments around the number
    const prefix = currentTitle.slice(0, match.index);
    const suffix = currentTitle.slice(match.index + match[0].length);
    const prefixFragment = prefix.slice(-Math.min(prefix.length, 6));
    const suffixFragment = suffix.slice(0, Math.min(suffix.length, 6));

    // Need at least one context fragment to avoid spurious matches
    if (prefixFragment === "" && suffixFragment === "") continue;

    const matchesContext = (candidate) =>
      (prefixFragment === "" || candidate.includes(prefixFragment)) &&
      (suffixFragment === "" || candidate.includes(suffixFragment));

    // Search subject entries
    for (const entry of subjectEntries) {
      if (matchesContext(entry.title) && entry.title.includes(String(nextNum))) {
        return entry;
      }
    }

    // Also try with zero-padded number
    const padded = String(nextNum).padStart(match[0].length, "0");
    if (padded !== String(nextNum)) {
      for (const entry of subjectEntries) {
        if (matchesContext(entry.title) && entry.title.includes(padded)) {
          return entry;
        }
      }
    }
  }

  return null;
}
