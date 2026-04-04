import { useState, useCallback } from "react";
import type { StreakData } from "@/types";
import { loadStreak, updateStreak as updateStr } from "@/lib/streak";

export function useStreak() {
  const [streak, setStreak] = useState<StreakData | null>(() => {
    if (typeof window === "undefined") return null;
    return loadStreak();
  });

  const updateStreak = useCallback((todayJst: string) => {
    const updated = updateStr(todayJst);
    setStreak(updated);
    return updated;
  }, []);

  return { streak, updateStreak };
}
