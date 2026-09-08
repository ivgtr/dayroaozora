import type { TodayState } from "@/types";
import { formatJstDate } from "@/lib/date-utils";

const STORAGE_KEY = "dayro:today";

export function loadTodayState(): TodayState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const state: TodayState = JSON.parse(raw);
    if (state.date !== formatJstDate(new Date())) return null;

    return state;
  } catch {
    return null;
  }
}

export function saveTodayState(state: TodayState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Keep reading when local storage is unavailable. */ }
}

export function createInitialState(workId: number, readingContentId?: string): TodayState {
  return {
    ...(readingContentId ? { readingContentId } : {}),
    date: formatJstDate(new Date()),
    workId,
    progress: 0,
    viewPosition: 0,
    tapCount: 0,
    startedAt: new Date().toISOString(),
    completed: false,
  };
}

/** Unknown old positions can only be retained while the text is also unidentified. */
export function reconcileTodayState(state: TodayState, readingContentId?: string): { state: TodayState; reset: boolean } {
  const reset = state.readingContentId !== readingContentId;
  if (!reset) return { state, reset: false };
  return { state: { ...state, readingContentId, progress: 0, viewPosition: 0, completed: false }, reset: true };
}
