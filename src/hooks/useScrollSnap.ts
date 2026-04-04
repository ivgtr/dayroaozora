import { useEffect, useRef, useCallback } from "react";

interface UseScrollSnapOptions {
  sentenceRefs: React.RefObject<Map<number, HTMLElement>>;
  totalVisible: number;
  onSnap: (index: number) => void;
  onUserScroll?: () => void;
  enabled: boolean;
}

interface UseScrollSnapReturn {
  scrollToSentence: (index: number) => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useScrollSnap({
  sentenceRefs,
  totalVisible,
  onSnap,
  onUserScroll,
  enabled,
}: UseScrollSnapOptions): UseScrollSnapReturn {
  const visibilityMap = useRef<Map<number, number>>(new Map());
  const isScrollingProgrammatically = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Set<HTMLElement>>(new Set());

  const onSnapRef = useRef(onSnap);
  const onUserScrollRef = useRef(onUserScroll);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onSnapRef.current = onSnap;
  }, [onSnap]);

  useEffect(() => {
    onUserScrollRef.current = onUserScroll;
  }, [onUserScroll]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const scrollToSentence = useCallback((index: number) => {
    const map = sentenceRefs.current;
    if (!map) return;
    const el = map.get(index);
    if (!el) return;

    isScrollingProgrammatically.current = true;

    if (programmaticTimerRef.current !== null) {
      clearTimeout(programmaticTimerRef.current);
    }
    programmaticTimerRef.current = setTimeout(() => {
      isScrollingProgrammatically.current = false;
      programmaticTimerRef.current = null;
    }, 800);

    const behavior = prefersReducedMotion() ? "instant" : "smooth";
    const rect = el.getBoundingClientRect();

    // 要素の下端がビューポートの上寄り（40%）に来るように
    const targetY = window.scrollY + rect.bottom - window.innerHeight * 0.4;
    window.scrollTo({ top: Math.max(0, targetY), behavior });
  }, [sentenceRefs]);

  // IntersectionObserver setup
  useEffect(() => {
    if (!enabled) {
      // Clean up observer when disabled
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      observedElements.current.clear();
      visibilityMap.current.clear();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(
            (entry.target as HTMLElement).dataset.paragraphIndex,
          );
          if (!Number.isNaN(index)) {
            visibilityMap.current.set(index, entry.intersectionRatio);
          }
        }
      },
      { threshold: [0, 0.5, 1.0] },
    );
    observerRef.current = observer;

    // Observe current elements
    const map = sentenceRefs.current;
    if (map) {
      for (let i = 0; i < totalVisible; i++) {
        const el = map.get(i);
        if (el) {
          observer.observe(el);
          observedElements.current.add(el);
        }
      }
    }

    const observed = observedElements.current;
    return () => {
      observer.disconnect();
      observed.clear();
    };
  }, [enabled, sentenceRefs, totalVisible]);

  // Update observed elements when totalVisible changes
  useEffect(() => {
    if (!enabled || !observerRef.current) return;
    const observer = observerRef.current;
    const map = sentenceRefs.current;
    if (!map) return;

    for (let i = 0; i < totalVisible; i++) {
      const el = map.get(i);
      if (el && !observedElements.current.has(el)) {
        observer.observe(el);
        observedElements.current.add(el);
      }
    }
  }, [enabled, sentenceRefs, totalVisible]);

  // Scroll event listener
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;

      // Notify user scroll (for typewriter skip)
      onUserScrollRef.current?.();

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;

        if (!enabledRef.current) return;
        if (isScrollingProgrammatically.current) return;

        // Find sentence with highest visibility ratio
        let bestIndex = -1;
        let bestRatio = -1;
        const viewportCenter = window.innerHeight / 2;

        visibilityMap.current.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          } else if (ratio === bestRatio && bestIndex >= 0) {
            // Tiebreak: pick the one closest to viewport center
            const map = sentenceRefs.current;
            if (!map) return;
            const currentEl = map.get(index);
            const bestEl = map.get(bestIndex);
            if (currentEl && bestEl) {
              const currentRect = currentEl.getBoundingClientRect();
              const bestRect = bestEl.getBoundingClientRect();
              const currentCenter =
                currentRect.top + currentRect.height / 2;
              const bestCenter = bestRect.top + bestRect.height / 2;
              if (
                Math.abs(currentCenter - viewportCenter) <
                Math.abs(bestCenter - viewportCenter)
              ) {
                bestIndex = index;
              }
            }
          }
        });

        if (bestIndex >= 0) {
          onSnapRef.current(bestIndex);
        }
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, sentenceRefs]);

  // Cleanup programmatic timer on unmount
  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current !== null) {
        clearTimeout(programmaticTimerRef.current);
      }
    };
  }, []);

  return { scrollToSentence };
}
