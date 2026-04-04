export interface DailyWork {
  workId: number;
  date: string; // YYYY-MM-DD (JST)
}

export interface TodayResponse {
  today: DailyWork;
  tomorrow: DailyWork;
}

export interface WorkResponse {
  workId: number;
  title: string;
  author: string;
  content: string;
  charCount: number;
}

export interface ErrorResponse {
  error: string;
}

export interface TodayState {
  date: string;
  workId: number;
  progress: number;
  viewPosition: number;
  tapCount: number;
  startedAt: string;
  completed: boolean;
}

export type ReadingPhase = "loading" | "transitioning" | "reading" | "error";
