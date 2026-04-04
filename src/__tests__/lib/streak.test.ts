// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadStreak,
  saveStreak,
  updateStreak,
  getYesterdayJst,
} from "@/lib/streak";

describe("streak", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadStreak", () => {
    it("returns initial values when key does not exist", () => {
      expect(loadStreak()).toEqual({ current: 0, lastDate: "", best: 0 });
    });

    it("returns parsed data", () => {
      const data = { current: 3, lastDate: "2026-04-04", best: 5 };
      localStorage.setItem("dayro:streak", JSON.stringify(data));
      expect(loadStreak()).toEqual(data);
    });

    it("returns initial values on parse error", () => {
      localStorage.setItem("dayro:streak", "invalid");
      expect(loadStreak()).toEqual({ current: 0, lastDate: "", best: 0 });
    });
  });

  describe("saveStreak", () => {
    it("persists data to localStorage", () => {
      const data = { current: 2, lastDate: "2026-04-04", best: 2 };
      saveStreak(data);
      expect(JSON.parse(localStorage.getItem("dayro:streak")!)).toEqual(data);
    });
  });

  describe("getYesterdayJst", () => {
    it("returns previous day", () => {
      expect(getYesterdayJst("2026-04-05")).toBe("2026-04-04");
    });

    it("handles month boundary", () => {
      expect(getYesterdayJst("2026-04-01")).toBe("2026-03-31");
    });

    it("handles year boundary", () => {
      expect(getYesterdayJst("2026-01-01")).toBe("2025-12-31");
    });

    it("handles leap year", () => {
      expect(getYesterdayJst("2024-03-01")).toBe("2024-02-29");
    });
  });

  describe("updateStreak", () => {
    it("starts streak at 1 on first completion", () => {
      const result = updateStreak("2026-04-05");
      expect(result.current).toBe(1);
      expect(result.lastDate).toBe("2026-04-05");
      expect(result.best).toBe(1);
    });

    it("does nothing on same-day duplicate call", () => {
      updateStreak("2026-04-05");
      const result = updateStreak("2026-04-05");
      expect(result.current).toBe(1);
    });

    it("increments on consecutive day", () => {
      updateStreak("2026-04-04");
      const result = updateStreak("2026-04-05");
      expect(result.current).toBe(2);
      expect(result.best).toBe(2);
    });

    it("resets on non-consecutive day", () => {
      updateStreak("2026-04-01");
      updateStreak("2026-04-02");
      const result = updateStreak("2026-04-05");
      expect(result.current).toBe(1);
      expect(result.best).toBe(2);
    });

    it("updates best when current exceeds it", () => {
      updateStreak("2026-04-01");
      updateStreak("2026-04-02");
      updateStreak("2026-04-03");
      expect(loadStreak().best).toBe(3);
      // Reset and start new streak
      updateStreak("2026-04-10");
      expect(loadStreak().best).toBe(3);
      expect(loadStreak().current).toBe(1);
    });
  });
});
