import type { BookshelfEntry } from "@/types";

const STORAGE_KEY = "dayro:bookshelf";

export function loadBookshelf(): BookshelfEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    return JSON.parse(raw) as BookshelfEntry[];
  } catch {
    return [];
  }
}

export function saveBookshelf(entries: BookshelfEntry[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* Keep the current reading session available. */ }
}

export function addFavorite(
  workId: number,
  firstLine: string,
  progress: number,
  viewPosition: number,
  readingContentId?: string,
): BookshelfEntry[] {
  const entries = loadBookshelf();
  const existing = entries.find((e) => e.workId === workId);

  if (existing) {
    if (existing.status === "completed") {
      existing.status = "favorite_completed";
      existing.favoriteAt = new Date().toISOString();
      saveBookshelf(entries);
    }
    // "favorite" or "favorite_completed" → idempotent, do nothing
    return entries;
  }

  const entry: BookshelfEntry = {
    ...(readingContentId ? { readingContentId } : {}),
    workId,
    title: null,
    author: null,
    firstLine,
    status: "favorite",
    favoriteAt: new Date().toISOString(),
    completedAt: null,
    readingTime: null,
    tapCount: null,
    lastProgress: progress,
    lastViewPosition: viewPosition,
  };

  const updated = [entry, ...entries];
  saveBookshelf(updated);
  return updated;
}

export function addCompleted(
  workId: number,
  title: string,
  author: string,
  firstLine: string,
  readingTime: number,
  tapCount: number,
  readingContentId?: string,
): BookshelfEntry[] {
  const entries = loadBookshelf();
  const existing = entries.find((e) => e.workId === workId);

  if (existing) {
    if (existing.status === "favorite") {
      existing.status = "favorite_completed";
    }
    existing.title = title;
    existing.author = author;
    existing.completedAt = new Date().toISOString();
    existing.readingTime = readingTime;
    existing.tapCount = tapCount;
    existing.lastProgress = null;
    existing.lastViewPosition = null;
    if (readingContentId) existing.readingContentId = readingContentId;
    // firstLine: preserve existing value on re-completion
    saveBookshelf(entries);
    return entries;
  }

  const entry: BookshelfEntry = {
    ...(readingContentId ? { readingContentId } : {}),
    workId,
    title,
    author,
    firstLine,
    status: "completed",
    favoriteAt: null,
    completedAt: new Date().toISOString(),
    readingTime,
    tapCount,
    lastProgress: null,
    lastViewPosition: null,
  };

  const updated = [entry, ...entries];
  saveBookshelf(updated);
  return updated;
}

export function removeEntry(workId: number): BookshelfEntry[] {
  const entries = loadBookshelf();
  const updated = entries.filter((e) => e.workId !== workId);
  saveBookshelf(updated);
  return updated;
}

export function removeFavorite(workId: number): BookshelfEntry[] {
  const entries = loadBookshelf();
  const existing = entries.find((e) => e.workId === workId);

  if (!existing) {
    return entries;
  }

  if (existing.status === "favorite") {
    const updated = entries.filter((e) => e.workId !== workId);
    saveBookshelf(updated);
    return updated;
  }

  if (existing.status === "favorite_completed") {
    existing.status = "completed";
    existing.favoriteAt = null;
    saveBookshelf(entries);
    return entries;
  }

  // "completed" → idempotent
  return entries;
}

export function isFavorite(
  entries: BookshelfEntry[],
  workId: number,
): boolean {
  const entry = entries.find((e) => e.workId === workId);
  return entry?.status === "favorite" || entry?.status === "favorite_completed";
}

export function updateReadingPosition(
  workId: number,
  progress: number,
  viewPosition: number,
  readingContentId?: string,
): BookshelfEntry[] {
  const entries = loadBookshelf();
  const existing = entries.find((e) => e.workId === workId);

  if (existing && existing.status === "favorite") {
    existing.lastProgress = progress;
    existing.lastViewPosition = viewPosition;
    if (readingContentId) existing.readingContentId = readingContentId;
    saveBookshelf(entries);
  }

  return entries;
}

export function reconcileBookshelfPosition(workId: number, readingContentId?: string): { entry?: BookshelfEntry; reset: boolean } {
  const entries = loadBookshelf();
  const entry = entries.find(value => value.workId === workId);
  if (!entry || entry.readingContentId === readingContentId) return { entry, reset: false };
  if (entry.lastProgress !== null) entry.lastProgress = 0;
  if (entry.lastViewPosition !== null) entry.lastViewPosition = 0;
  entry.readingContentId = readingContentId;
  saveBookshelf(entries);
  return { entry, reset: true };
}
