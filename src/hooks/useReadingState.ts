import { useState, useCallback } from "react";
import type { TodayState } from "@/types";
import { saveTodayState } from "@/lib/reading-state";
import { formatJstDate } from "@/lib/daily-work";

interface UseReadingStateOptions {
  initialState: TodayState;
  totalSentences: number;
  onViewPositionChange?: (index: number) => void;
  onDateChange?: () => void;
  onComplete?: (tapCount: number) => void;
  skipPersist?: boolean;
}

interface UseReadingStateReturn {
  progress: number;
  viewPosition: number;
  tapCount: number;
  isNewSentence: boolean;
  handleTap: () => void;
  setViewPosition: (index: number) => void;
}

export function useReadingState({
  initialState,
  totalSentences,
  onViewPositionChange,
  onDateChange,
  onComplete,
  skipPersist = false,
}: UseReadingStateOptions): UseReadingStateReturn {
  const [state, setState] = useState<TodayState>(initialState);
  const [isNewSentence, setIsNewSentence] = useState(false);

  const handleTap = useCallback(() => {
    // Reset pulse flag so React detects the false→true transition
    setIsNewSentence(false);

    if (formatJstDate(new Date()) !== state.date) {
      onDateChange?.();
      return;
    }

    const lastIndex = totalSentences - 1;

    // At the last sentence: trigger completion
    if (state.progress === lastIndex && state.viewPosition === lastIndex) {
      const finalTapCount = state.tapCount + 1;
      const next: TodayState = { ...state, tapCount: finalTapCount, completed: true };
      setState(next);
      if (!skipPersist) {
        saveTodayState(next);
      }
      onComplete?.(finalTapCount);
      return;
    }

    if (state.viewPosition === state.progress && state.progress < lastIndex) {
      // Advance both progress and viewPosition
      const next: TodayState = {
        ...state,
        progress: state.progress + 1,
        viewPosition: state.viewPosition + 1,
        tapCount: state.tapCount + 1,
      };
      setState(next);
      setIsNewSentence(true);
      if (!skipPersist) {
        saveTodayState(next);
      }
      onViewPositionChange?.(next.viewPosition);
    } else if (state.viewPosition < state.progress) {
      // Catch up viewPosition toward progress
      const next: TodayState = {
        ...state,
        viewPosition: state.viewPosition + 1,
        tapCount: state.tapCount + 1,
      };
      setState(next);
      if (!skipPersist) {
        saveTodayState(next);
      }
      onViewPositionChange?.(next.viewPosition);
    }
  }, [state, totalSentences, onViewPositionChange, onDateChange, onComplete, skipPersist]);

  const setViewPosition = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, state.progress));
      const next: TodayState = {
        ...state,
        viewPosition: clamped,
      };
      setState(next);
      if (!skipPersist) {
        saveTodayState(next);
      }
      onViewPositionChange?.(clamped);
    },
    [state, onViewPositionChange, skipPersist],
  );

  return {
    progress: state.progress,
    viewPosition: state.viewPosition,
    tapCount: state.tapCount,
    isNewSentence,
    handleTap,
    setViewPosition,
  };
}
