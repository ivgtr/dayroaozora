// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTypewriter } from "@/hooks/useTypewriter";

describe("useTypewriter", () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafId: number;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    rafCallbacks = new Map();
    rafId = 0;

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, cb);
      return id;
    });

    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      rafCallbacks.delete(id);
    });

    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
  });

  function flushRaf(timestamp: number) {
    const cbs = Array.from(rafCallbacks.entries());
    rafCallbacks.clear();
    for (const [, cb] of cbs) {
      cb(timestamp);
    }
  }

  it("shows full text and is not animating when isActive is false", () => {
    const { result } = renderHook(() =>
      useTypewriter({ text: "こんにちは", isActive: false }),
    );

    expect(result.current.displayedText).toBe("こんにちは");
    expect(result.current.isAnimating).toBe(false);
  });

  it("starts empty and progressively reveals characters when isActive is true", () => {
    const { result } = renderHook(() =>
      useTypewriter({ text: "Hello", isActive: true, charInterval: 40 }),
    );

    // Before first rAF frame, displayedText is empty
    expect(result.current.displayedText).toBe("");

    // First frame at t=0: animation starts, 0 chars shown (Math.floor(0/40) = 0)
    act(() => flushRaf(0));
    expect(result.current.displayedText).toBe("");
    expect(result.current.isAnimating).toBe(true);

    // Frame at t=80 → 2 chars (Math.floor(80/40) = 2)
    act(() => flushRaf(80));
    expect(result.current.displayedText).toBe("He");
    expect(result.current.isAnimating).toBe(true);

    // Frame at t=200 → 5 chars = full text
    act(() => flushRaf(200));
    expect(result.current.displayedText).toBe("Hello");
    expect(result.current.isAnimating).toBe(false);
  });

  it("immediately shows full text when skip() is called during animation", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTypewriter({
        text: "Hello",
        isActive: true,
        charInterval: 40,
        onComplete,
      }),
    );

    // Start animation with first frame
    act(() => flushRaf(0));
    expect(result.current.isAnimating).toBe(true);

    // Skip
    act(() => result.current.skip());

    expect(result.current.displayedText).toBe("Hello");
    expect(result.current.isAnimating).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("calls onComplete when text is fully displayed", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTypewriter({
        text: "Hi",
        isActive: true,
        charInterval: 40,
        onComplete,
      }),
    );

    // First frame at t=0
    act(() => flushRaf(0));
    expect(onComplete).not.toHaveBeenCalled();

    // t=80 → 2 chars = full text for "Hi"
    act(() => flushRaf(80));
    expect(result.current.displayedText).toBe("Hi");
    expect(result.current.isAnimating).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("shows text immediately without animation when prefers-reduced-motion is enabled", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTypewriter({
        text: "すぐに表示",
        isActive: true,
        onComplete,
      }),
    );

    // Reduced motion uses a single rAF to set state
    act(() => flushRaf(0));

    expect(result.current.displayedText).toBe("すぐに表示");
    expect(result.current.isAnimating).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cleans up animation when isActive becomes false", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        useTypewriter({ text: "Hello", isActive, charInterval: 40 }),
      { initialProps: { isActive: true } },
    );

    // Start animation
    act(() => flushRaf(0));
    expect(result.current.isAnimating).toBe(true);

    // Deactivate
    rerender({ isActive: false });

    expect(result.current.displayedText).toBe("Hello");
    expect(result.current.isAnimating).toBe(false);
    expect(rafCallbacks.size).toBe(0);
  });
});
