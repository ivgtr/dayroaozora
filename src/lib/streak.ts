import type { StreakData } from "@/types";

const STORAGE_KEY = "dayro:streak";

const INITIAL_STREAK: StreakData = { current: 0, lastDate: "", best: 0 };

export function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ...INITIAL_STREAK };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { ...INITIAL_STREAK };
  }
}

export function saveStreak(data: StreakData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getYesterdayJst(todayJst: string): string {
  const [y, m, d] = todayJst.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function updateStreak(todayJst: string): StreakData {
  const streak = loadStreak();

  if (streak.lastDate === todayJst) {
    return streak;
  }

  const yesterday = getYesterdayJst(todayJst);

  if (streak.lastDate === yesterday) {
    streak.current += 1;
    streak.best = Math.max(streak.best, streak.current);
  } else {
    streak.current = 1;
    streak.best = Math.max(streak.best, 1);
  }

  streak.lastDate = todayJst;
  saveStreak(streak);
  return streak;
}
