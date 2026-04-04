import { useState, useEffect, useRef, useCallback } from "react";

interface UseTypewriterOptions {
  text: string;
  isActive: boolean;
  charInterval?: number;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayedText: string;
  displayedChars: number;
  isAnimating: boolean;
  skip: () => void;
}

const DEFAULT_CHAR_INTERVAL = 40;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const noop = () => {};

export function useTypewriter({
  text,
  isActive,
  charInterval = DEFAULT_CHAR_INTERVAL,
  onComplete,
}: UseTypewriterOptions): UseTypewriterReturn {
  const [displayedChars, setDisplayedChars] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const displayedCharsRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const cancelAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const finishAnimation = useCallback(() => {
    cancelAnimation();
    const len = textRef.current.length;
    displayedCharsRef.current = len;
    setDisplayedChars(len);
    setIsAnimating(false);
    onCompleteRef.current?.();
  }, [cancelAnimation]);

  const skip = useCallback(() => {
    finishAnimation();
  }, [finishAnimation]);

  useEffect(() => {
    if (!isActive) {
      cancelAnimation();
      return;
    }

    if (prefersReducedMotion()) {
      cancelAnimation();
      const id = requestAnimationFrame(() => {
        displayedCharsRef.current = text.length;
        setDisplayedChars(text.length);
        setIsAnimating(false);
        onCompleteRef.current?.();
      });
      return () => cancelAnimationFrame(id);
    }

    // Reset via rAF to avoid synchronous setState in effect body
    displayedCharsRef.current = 0;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
        setDisplayedChars(0);
        setIsAnimating(true);
      }

      const elapsed = timestamp - startTimeRef.current;
      const chars = Math.floor(elapsed / charInterval);
      const targetLen = textRef.current.length;

      if (chars >= targetLen) {
        displayedCharsRef.current = targetLen;
        setDisplayedChars(targetLen);
        setIsAnimating(false);
        rafIdRef.current = null;
        startTimeRef.current = null;
        onCompleteRef.current?.();
        return;
      }

      if (chars !== displayedCharsRef.current) {
        displayedCharsRef.current = chars;
        setDisplayedChars(chars);
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimation();
    };
  }, [isActive, text, charInterval, cancelAnimation]);

  if (!isActive) {
    return {
      displayedText: text,
      displayedChars: text.length,
      isAnimating: false,
      skip: noop,
    };
  }

  // When active but animation hasn't started yet (gap before first rAF fires),
  // displayedChars may hold a stale value. Show empty text to prevent flash.
  if (!isAnimating && displayedChars !== text.length) {
    return {
      displayedText: "",
      displayedChars: 0,
      isAnimating: false,
      skip,
    };
  }

  return {
    displayedText: text.slice(0, displayedChars),
    displayedChars,
    isAnimating,
    skip,
  };
}
