// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTypewriter } from "@/hooks/useTypewriter";

describe("useTypewriter", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
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

  it("returns null controller when isActive is false", () => {
    const { result } = renderHook(() =>
      useTypewriter({ isActive: false }),
    );

    expect(result.current.controller).toBeNull();
    expect(result.current.isAnimatingRef.current).toBe(false);
  });

  it("returns controller with correct charInterval when isActive is true", () => {
    const { result } = renderHook(() =>
      useTypewriter({ isActive: true, charInterval: 50 }),
    );

    expect(result.current.controller).not.toBeNull();
    expect(result.current.controller!.charInterval).toBe(50);
  });

  it("uses default charInterval of 40ms", () => {
    const { result } = renderHook(() =>
      useTypewriter({ isActive: true }),
    );

    expect(result.current.controller!.charInterval).toBe(40);
  });

  it("skip() sets skipRef and clears isAnimatingRef", () => {
    const { result } = renderHook(() =>
      useTypewriter({ isActive: true }),
    );

    // Simulate animation start (as TypewriterText would do)
    result.current.isAnimatingRef.current = true;

    act(() => result.current.skip());

    expect(result.current.controller!.skipRef.current).toBe(true);
    expect(result.current.isAnimatingRef.current).toBe(false);
  });

  it("skip() is noop when not animating", () => {
    const { result } = renderHook(() =>
      useTypewriter({ isActive: true }),
    );

    // isAnimatingRef is false by default
    act(() => result.current.skip());

    expect(result.current.controller!.skipRef.current).toBe(false);
  });

  it("onEnd clears isAnimatingRef and calls onComplete", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTypewriter({ isActive: true, onComplete }),
    );

    result.current.isAnimatingRef.current = true;

    act(() => result.current.controller!.onEnd());

    expect(result.current.isAnimatingRef.current).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("controller has reducedMotion=true when prefers-reduced-motion is enabled", () => {
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

    const { result } = renderHook(() =>
      useTypewriter({ isActive: true }),
    );

    expect(result.current.controller!.reducedMotion).toBe(true);
  });

  it("returns null controller and noop skip when deactivated", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => useTypewriter({ isActive }),
      { initialProps: { isActive: true } },
    );

    expect(result.current.controller).not.toBeNull();

    rerender({ isActive: false });

    expect(result.current.controller).toBeNull();
  });
});
