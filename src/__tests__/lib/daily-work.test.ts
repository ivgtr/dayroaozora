import { describe, it, expect } from "vitest";
import { getDayIndex, formatJstDate, getSecondsUntilJstMidnight } from "@/lib/date-utils";

describe("getDayIndex", () => {
  it("returns 0 for the epoch date (2026-01-01 JST)", () => {
    const epoch = new Date("2026-01-01T00:00:00+09:00");
    expect(getDayIndex(epoch)).toBe(0);
  });

  it("returns 1 for the day after epoch", () => {
    const dayAfter = new Date("2026-01-02T12:00:00+09:00");
    expect(getDayIndex(dayAfter)).toBe(1);
  });

  it("returns the same index for the same JST date regardless of time", () => {
    const morning = new Date("2026-04-04T06:00:00+09:00");
    const evening = new Date("2026-04-04T23:59:59+09:00");
    expect(getDayIndex(morning)).toBe(getDayIndex(evening));
  });

  it("increments at JST midnight boundary", () => {
    const beforeMidnight = new Date("2026-04-04T23:59:59+09:00");
    const afterMidnight = new Date("2026-04-05T00:00:01+09:00");
    expect(getDayIndex(afterMidnight)).toBe(getDayIndex(beforeMidnight) + 1);
  });

  it("returns a positive number for dates after epoch", () => {
    const future = new Date("2026-06-15T10:00:00+09:00");
    expect(getDayIndex(future)).toBeGreaterThan(0);
  });

  it("handles UTC dates correctly (server runs in UTC)", () => {
    // UTC 15:00 = JST 00:00 (next day in JST)
    const utc15 = new Date("2026-04-04T15:00:00Z");
    // UTC 14:59 = JST 23:59 (same day in JST)
    const utc14 = new Date("2026-04-04T14:59:59Z");
    expect(getDayIndex(utc15)).toBe(getDayIndex(utc14) + 1);
  });
});

describe("formatJstDate", () => {
  it("formats a JST date as YYYY-MM-DD", () => {
    const date = new Date("2026-04-04T15:00:00+09:00");
    expect(formatJstDate(date)).toBe("2026-04-04");
  });

  it("handles UTC dates that cross JST day boundary", () => {
    // UTC 15:00 = JST 次の日 00:00
    const utcDate = new Date("2026-04-04T15:00:00Z");
    expect(formatJstDate(utcDate)).toBe("2026-04-05");
  });

  it("keeps same JST date for UTC before boundary", () => {
    // UTC 14:59 = JST 23:59 (同日)
    const utcDate = new Date("2026-04-04T14:59:59Z");
    expect(formatJstDate(utcDate)).toBe("2026-04-04");
  });
});

describe("getSecondsUntilJstMidnight", () => {
  it("returns seconds until next JST midnight", () => {
    const date = new Date("2026-04-04T23:00:00+09:00");
    const seconds = getSecondsUntilJstMidnight(date);
    expect(seconds).toBe(3600);
  });

  it("returns a full day of seconds at JST midnight", () => {
    const midnight = new Date("2026-04-04T00:00:00+09:00");
    const seconds = getSecondsUntilJstMidnight(midnight);
    expect(seconds).toBe(86400);
  });

  it("works correctly from UTC perspective", () => {
    // UTC 14:00 = JST 23:00 → 1 hour until JST midnight
    const utcDate = new Date("2026-04-04T14:00:00Z");
    expect(getSecondsUntilJstMidnight(utcDate)).toBe(3600);
  });

  it("always returns a positive value", () => {
    const now = new Date();
    expect(getSecondsUntilJstMidnight(now)).toBeGreaterThan(0);
  });
});
