export function formatThreadStat(stat, config) {
  const isWarning =
    !stat.dead &&
    (stat.resCount >= config.resWarningThreshold ||
      (stat.datSizeKB !== null && stat.datSizeKB >= config.datSizeWarningKB));

  const res = stat.resCount !== null ? stat.resCount : "dat落ち";
  const size = stat.datSizeKB !== null ? `${stat.datSizeKB.toFixed(1)}KB` : "N/A";

  const [label, color] = stat.dead
    ? ["死亡", "\x1b[31m"]
    : isWarning
      ? ["警告", "\x1b[33m"]
      : ["正常", ""];

  const detail = `${label} レス=${res} dat=${size}`;
  const colored = color ? `${color}${detail}\x1b[0m` : detail;

  return { header: `  #${stat.id} ${stat.title}`, detail: `       ${colored}` };
}
