export interface DailyWork {
  workId: number;
  date: string; // YYYY-MM-DD (JST)
}

export interface TodayResponse {
  today: DailyWork;
  tomorrow: DailyWork;
}

import type { ContentBlock, InlineNode } from "@/lib/aozora/types";

export type { ContentBlock, InlineNode };

export interface WorkResponse {
  workId: number;
  title: string;
  author: string;
  blocks: ContentBlock[];
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

export type BookshelfStatus = "favorite" | "completed" | "favorite_completed";

export interface BookshelfEntry {
  workId: number;
  title: string | null;
  author: string | null;
  firstLine: string;
  status: BookshelfStatus;
  favoriteAt: string | null;
  completedAt: string | null;
  readingTime: number | null;
  tapCount: number | null;
  lastProgress: number | null;
  lastViewPosition: number | null;
}

export interface StreakData {
  current: number;
  lastDate: string;
  best: number;
}

export interface Sentence {
  nodes: InlineNode[];
  text: string;
}

export interface Paragraph {
  sentences: Sentence[];
  startIndex: number;
}

export type Theme = "light" | "dark" | "system";

export interface ShareTextParams {
  title: string;
  author: string;
  readingTime: number;
  tapCount: number;
  streak: number;
  isBookshelfReread: boolean;
  siteUrl: string;
}
