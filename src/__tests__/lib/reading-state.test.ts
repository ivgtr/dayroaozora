// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/daily-work", () => ({
  formatJstDate: vi.fn(() => "2026-04-04"),
}));

import {
  loadTodayState,
  saveTodayState,
  createInitialState,
} from "@/lib/reading-state";
import type { TodayState } from "@/types";
import { formatJstDate } from "@/lib/daily-work";

describe("reading-state", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(formatJstDate).mockReturnValue("2026-04-04");
  });

  describe("save/load roundtrip", () => {
    it("loads the same state that was saved", () => {
      const state: TodayState = {
        date: "2026-04-04",
        workId: 42,
        progress: 5,
        viewPosition: 120,
        tapCount: 3,
        startedAt: "2026-04-04T10:00:00.000Z",
        completed: false,
      };

      saveTodayState(state);
      const loaded = loadTodayState();

      expect(loaded).toEqual(state);
    });
  });

  describe("date match", () => {
    it("returns the state when date matches today", () => {
      const state: TodayState = {
        date: "2026-04-04",
        workId: 10,
        progress: 0,
        viewPosition: 0,
        tapCount: 0,
        startedAt: "2026-04-04T09:00:00.000Z",
        completed: false,
      };

      saveTodayState(state);
      const loaded = loadTodayState();

      expect(loaded).not.toBeNull();
      expect(loaded!.workId).toBe(10);
    });
  });

  describe("date mismatch", () => {
    it("returns null when saved date is yesterday", () => {
      const state: TodayState = {
        date: "2026-04-03",
        workId: 10,
        progress: 8,
        viewPosition: 500,
        tapCount: 5,
        startedAt: "2026-04-03T09:00:00.000Z",
        completed: false,
      };

      saveTodayState(state);
      const loaded = loadTodayState();

      expect(loaded).toBeNull();
    });
  });

  describe("createInitialState", () => {
    it("returns correct defaults", () => {
      const state = createInitialState(99);

      expect(state.date).toBe("2026-04-04");
      expect(state.workId).toBe(99);
      expect(state.progress).toBe(0);
      expect(state.viewPosition).toBe(0);
      expect(state.tapCount).toBe(0);
      expect(state.completed).toBe(false);
      expect(state.startedAt).toBeDefined();
    });
  });

  describe("corrupted JSON fallback", () => {
    it("returns null for invalid JSON", () => {
      localStorage.setItem("dayro:today", "not valid json");
      const loaded = loadTodayState();

      expect(loaded).toBeNull();
    });
  });

  describe("missing key fallback", () => {
    it("returns null when key does not exist", () => {
      localStorage.clear();
      const loaded = loadTodayState();

      expect(loaded).toBeNull();
    });
  });
});
