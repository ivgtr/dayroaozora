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
