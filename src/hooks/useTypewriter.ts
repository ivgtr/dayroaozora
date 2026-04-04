import { useRef, useCallback, useMemo, useEffect } from "react";

const DEFAULT_CHAR_INTERVAL = 40;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface TypewriterController {
  charInterval: number;
  skipRef: React.RefObject<boolean>;
  isAnimatingRef: React.RefObject<boolean>;
  onEnd: () => void;
  reducedMotion: boolean;
}

interface UseTypewriterOptions {
  isActive: boolean;
  charInterval?: number;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  skip: () => void;
  isAnimatingRef: React.RefObject<boolean>;
  controller: TypewriterController | null;
}

const noop = () => {};

export function useTypewriter({
  isActive,
  charInterval = DEFAULT_CHAR_INTERVAL,
  onComplete,
}: UseTypewriterOptions): UseTypewriterReturn {
  const isAnimatingRef = useRef(false);
  const skipRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const onEnd = useCallback(() => {
    isAnimatingRef.current = false;
    onCompleteRef.current?.();
  }, []);

  const skip = useCallback(() => {
    if (isAnimatingRef.current) {
      skipRef.current = true;
      isAnimatingRef.current = false;
    }
  }, []);

  const controller = useMemo<TypewriterController | null>(() => {
    if (!isActive) return null;
    return {
      charInterval,
      skipRef,
      isAnimatingRef,
      onEnd,
      reducedMotion: prefersReducedMotion(),
    };
  }, [isActive, charInterval, onEnd]);

  if (!isActive) {
    return { skip: noop, isAnimatingRef, controller: null };
  }

  return { skip, isAnimatingRef, controller };
}
