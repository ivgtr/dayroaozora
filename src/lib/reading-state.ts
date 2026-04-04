import type { TodayState } from "@/types";
import { formatJstDate } from "@/lib/daily-work";

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createInitialState(workId: number): TodayState {
  return {
    date: formatJstDate(new Date()),
    workId,
    progress: 0,
    viewPosition: 0,
    tapCount: 0,
    startedAt: new Date().toISOString(),
    completed: false,
  };
}
