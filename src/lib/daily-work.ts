import type { DailyWork, TodayResponse } from "@/types";
import { getIdList } from "./id-list";
import { getDayIndex, formatJstDate, MS_PER_DAY } from "./date-utils";

export function getTodayWork(now: Date = new Date()): TodayResponse {
  const ids = getIdList();
  const dayIndex = getDayIndex(now);

  const todayId = ids[dayIndex % ids.length];
  const tomorrowId = ids[(dayIndex + 1) % ids.length];

  const today: DailyWork = {
    workId: todayId,
    date: formatJstDate(now),
  };

  const tomorrowWork: DailyWork = {
    workId: tomorrowId,
    date: formatJstDate(new Date(now.getTime() + MS_PER_DAY)),
  };

  return { today, tomorrow: tomorrowWork };
}
