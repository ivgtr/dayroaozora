const EPOCH = new Date("2026-01-01T00:00:00+09:00").getTime();
const MS_PER_DAY = 86_400_000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export { MS_PER_DAY };

function toJstMs(now: Date): number {
  return now.getTime() + JST_OFFSET_MS;
}

export function getDayIndex(now: Date = new Date()): number {
  const jstMs = toJstMs(now);
  const jstDate = new Date(jstMs);
  const jstMidnightMs = Date.UTC(
    jstDate.getUTCFullYear(),
    jstDate.getUTCMonth(),
    jstDate.getUTCDate()
  );
  return Math.floor((jstMidnightMs - (EPOCH + JST_OFFSET_MS)) / MS_PER_DAY);
}

export function formatJstDate(now: Date = new Date()): string {
  const jstDate = new Date(toJstMs(now));
  const y = jstDate.getUTCFullYear();
  const m = String(jstDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jstDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getSecondsUntilJstMidnight(now: Date = new Date()): number {
  const jstMs = toJstMs(now);
  const jstDate = new Date(jstMs);
  const nextMidnightUtcMs = Date.UTC(
    jstDate.getUTCFullYear(),
    jstDate.getUTCMonth(),
    jstDate.getUTCDate() + 1
  );
  return Math.ceil((nextMidnightUtcMs - jstMs) / 1000);
}
