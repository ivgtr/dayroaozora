// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/reading-state", () => ({
  saveTodayState: vi.fn(),
}));

vi.mock("@/lib/daily-work", () => ({
  formatJstDate: vi.fn(() => "2026-04-04"),
}));

import { useReadingState } from "@/hooks/useReadingState";
import { saveTodayState } from "@/lib/reading-state";
import type { TodayState } from "@/types";

function makeState(overrides: Partial<TodayState> = {}): TodayState {
  return {
    date: "2026-04-04",
    workId: 1,
    progress: 0,
    viewPosition: 0,
    tapCount: 0,
    startedAt: "2026-04-04T00:00:00.000Z",
    completed: false,
    ...overrides,
  };
}

describe("useReadingState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tap at progress==viewPosition", () => {
    it("increments both progress and viewPosition, isNewSentence=true", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 0, viewPosition: 0 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.handleTap();
      });

      expect(result.current.progress).toBe(1);
      expect(result.current.viewPosition).toBe(1);
      expect(result.current.isNewSentence).toBe(true);
      expect(result.current.tapCount).toBe(1);
    });
  });

  describe("tap at viewPosition < progress", () => {
    it("increments viewPosition only, isNewSentence=false", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 5, viewPosition: 2 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.handleTap();
      });

      expect(result.current.progress).toBe(5);
      expect(result.current.viewPosition).toBe(3);
      expect(result.current.isNewSentence).toBe(false);
      expect(result.current.tapCount).toBe(1);
    });
  });

  describe("tapCount increments on every tap", () => {
    it("accumulates tapCount across multiple taps", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 0, viewPosition: 0 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.handleTap();
      });
      act(() => {
        result.current.handleTap();
      });
      act(() => {
        result.current.handleTap();
      });

      expect(result.current.tapCount).toBe(3);
      expect(result.current.progress).toBe(3);
      expect(result.current.viewPosition).toBe(3);
    });
  });

  describe("last sentence tap", () => {
    it("calls onComplete with incremented tapCount when at the last sentence", () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({
            progress: 9,
            viewPosition: 9,
            tapCount: 5,
          }),
          totalSentences: 10,
          onComplete,
        }),
      );

      act(() => {
        result.current.handleTap();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(6);
      expect(result.current.progress).toBe(9);
      expect(result.current.viewPosition).toBe(9);
      expect(result.current.tapCount).toBe(6);
    });
  });

  describe("saveTodayState called on state change", () => {
    it("calls saveTodayState after handleTap", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 0, viewPosition: 0 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.handleTap();
      });

      expect(saveTodayState).toHaveBeenCalledTimes(1);
      expect(saveTodayState).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 1,
          viewPosition: 1,
          tapCount: 1,
        }),
      );
    });

    it("calls saveTodayState with completed: true and incremented tapCount on last-sentence tap", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 9, viewPosition: 9, tapCount: 3 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.handleTap();
      });

      expect(saveTodayState).toHaveBeenCalledTimes(1);
      expect(saveTodayState).toHaveBeenCalledWith(
        expect.objectContaining({ completed: true, tapCount: 4 }),
      );
    });

    it("calls saveTodayState after setViewPosition", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 5, viewPosition: 5 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.setViewPosition(2);
      });

      expect(saveTodayState).toHaveBeenCalledTimes(1);
      expect(saveTodayState).toHaveBeenCalledWith(
        expect.objectContaining({ viewPosition: 2 }),
      );
    });
  });

  describe("onViewPositionChange callback", () => {
    it("is called when viewPosition changes via handleTap", () => {
      const cb = vi.fn();
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 0, viewPosition: 0 }),
          totalSentences: 10,
          onViewPositionChange: cb,
        }),
      );

      act(() => {
        result.current.handleTap();
      });

      expect(cb).toHaveBeenCalledWith(1);
    });

    it("is called when viewPosition changes via setViewPosition", () => {
      const cb = vi.fn();
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 5, viewPosition: 5 }),
          totalSentences: 10,
          onViewPositionChange: cb,
        }),
      );

      act(() => {
        result.current.setViewPosition(3);
      });

      expect(cb).toHaveBeenCalledWith(3);
    });
  });

  describe("setViewPosition", () => {
    it("clamps to progress when index exceeds progress", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 3, viewPosition: 3 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.setViewPosition(7);
      });

      expect(result.current.viewPosition).toBe(3);
    });

    it("clamps to 0 when index is negative", () => {
      const { result } = renderHook(() =>
        useReadingState({
          initialState: makeState({ progress: 5, viewPosition: 3 }),
          totalSentences: 10,
        }),
      );

      act(() => {
        result.current.setViewPosition(-2);
      });

      expect(result.current.viewPosition).toBe(0);
    });
  });
});
