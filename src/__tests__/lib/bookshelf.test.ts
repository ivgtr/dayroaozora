// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadBookshelf,
  saveBookshelf,
  addFavorite,
  addCompleted,
  removeEntry,
  removeFavorite,
  isFavorite,
  updateReadingPosition,
} from "@/lib/bookshelf";
import type { BookshelfEntry } from "@/types";

function makeEntry(overrides: Partial<BookshelfEntry> = {}): BookshelfEntry {
  return {
    workId: 1,
    title: null,
    author: null,
    firstLine: "冒頭の一文です。",
    status: "favorite",
    favoriteAt: "2026-04-04T00:00:00.000Z",
    completedAt: null,
    readingTime: null,
    tapCount: null,
    lastProgress: 3,
    lastViewPosition: 3,
    ...overrides,
  };
}

describe("bookshelf", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("loadBookshelf", () => {
    it("returns empty array when key does not exist", () => {
      expect(loadBookshelf()).toEqual([]);
    });

    it("returns parsed entries", () => {
      const entries = [makeEntry()];
      localStorage.setItem("dayro:bookshelf", JSON.stringify(entries));
      expect(loadBookshelf()).toEqual(entries);
    });

    it("returns empty array on parse error", () => {
      localStorage.setItem("dayro:bookshelf", "invalid json");
      expect(loadBookshelf()).toEqual([]);
    });
  });

  describe("saveBookshelf", () => {
    it("persists entries to localStorage", () => {
      const entries = [makeEntry()];
      saveBookshelf(entries);
      expect(JSON.parse(localStorage.getItem("dayro:bookshelf")!)).toEqual(
        entries,
      );
    });
  });

  describe("addFavorite", () => {
    it("adds a new favorite entry at the beginning", () => {
      const result = addFavorite(1, "冒頭の一文です。", 3, 3);
      expect(result).toHaveLength(1);
      expect(result[0].workId).toBe(1);
      expect(result[0].status).toBe("favorite");
      expect(result[0].title).toBeNull();
      expect(result[0].author).toBeNull();
      expect(result[0].lastProgress).toBe(3);
      expect(result[0].lastViewPosition).toBe(3);
      expect(result[0].favoriteAt).toBeTruthy();
    });

    it("is idempotent for existing favorite", () => {
      addFavorite(1, "冒頭の一文です。", 3, 3);
      const result = addFavorite(1, "冒頭の一文です。", 5, 5);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("favorite");
    });

    it("is idempotent for existing favorite_completed", () => {
      const entries = [makeEntry({ status: "favorite_completed" })];
      saveBookshelf(entries);
      const result = addFavorite(1, "冒頭の一文です。", 5, 5);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("favorite_completed");
    });

    it("transitions completed → favorite_completed without updating lastProgress/lastViewPosition", () => {
      const entries = [
        makeEntry({
          status: "completed",
          title: "タイトル",
          author: "著者",
          completedAt: "2026-04-04T00:00:00.000Z",
          lastProgress: null,
          lastViewPosition: null,
        }),
      ];
      saveBookshelf(entries);
      const result = addFavorite(1, "冒頭の一文です。", 5, 5);
      expect(result[0].status).toBe("favorite_completed");
      expect(result[0].favoriteAt).toBeTruthy();
      expect(result[0].lastProgress).toBeNull();
      expect(result[0].lastViewPosition).toBeNull();
    });
  });

  describe("addCompleted", () => {
    it("adds a new completed entry at the beginning", () => {
      const result = addCompleted(1, "タイトル", "著者", "冒頭", 60000, 10);
      expect(result).toHaveLength(1);
      expect(result[0].workId).toBe(1);
      expect(result[0].status).toBe("completed");
      expect(result[0].title).toBe("タイトル");
      expect(result[0].author).toBe("著者");
      expect(result[0].readingTime).toBe(60000);
      expect(result[0].tapCount).toBe(10);
      expect(result[0].completedAt).toBeTruthy();
    });

    it("transitions favorite → favorite_completed", () => {
      addFavorite(1, "冒頭の一文です。", 3, 3);
      const result = addCompleted(1, "タイトル", "著者", "冒頭", 60000, 10);
      expect(result[0].status).toBe("favorite_completed");
      expect(result[0].title).toBe("タイトル");
      expect(result[0].lastProgress).toBeNull();
      expect(result[0].lastViewPosition).toBeNull();
    });

    it("updates readingTime/tapCount on re-completion, preserves firstLine", () => {
      addCompleted(1, "タイトル", "著者", "元の冒頭", 60000, 10);
      const result = addCompleted(1, "タイトル", "著者", "新しい冒頭", 90000, 15);
      expect(result[0].readingTime).toBe(90000);
      expect(result[0].tapCount).toBe(15);
      expect(result[0].firstLine).toBe("元の冒頭");
    });

    it("updates favorite_completed on re-completion", () => {
      const entries = [
        makeEntry({
          status: "favorite_completed",
          title: "タイトル",
          author: "著者",
          completedAt: "2026-04-04T00:00:00.000Z",
        }),
      ];
      saveBookshelf(entries);
      const result = addCompleted(1, "タイトル", "著者", "冒頭", 120000, 20);
      expect(result[0].status).toBe("favorite_completed");
      expect(result[0].readingTime).toBe(120000);
    });
  });

  describe("removeEntry", () => {
    it("removes an entry by workId", () => {
      addFavorite(1, "冒頭1", 0, 0);
      addFavorite(2, "冒頭2", 0, 0);
      const result = removeEntry(1);
      expect(result).toHaveLength(1);
      expect(result[0].workId).toBe(2);
    });

    it("returns unchanged array if workId not found", () => {
      addFavorite(1, "冒頭1", 0, 0);
      const result = removeEntry(999);
      expect(result).toHaveLength(1);
    });
  });

  describe("removeFavorite", () => {
    it("deletes entry when status is favorite", () => {
      addFavorite(1, "冒頭", 0, 0);
      const result = removeFavorite(1);
      expect(result).toHaveLength(0);
    });

    it("transitions favorite_completed → completed", () => {
      const entries = [
        makeEntry({
          status: "favorite_completed",
          title: "タイトル",
          author: "著者",
          favoriteAt: "2026-04-04T00:00:00.000Z",
          completedAt: "2026-04-04T01:00:00.000Z",
        }),
      ];
      saveBookshelf(entries);
      const result = removeFavorite(1);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("completed");
      expect(result[0].favoriteAt).toBeNull();
    });

    it("is idempotent for completed status", () => {
      const entries = [
        makeEntry({
          status: "completed",
          title: "タイトル",
          author: "著者",
        }),
      ];
      saveBookshelf(entries);
      const result = removeFavorite(1);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("completed");
    });
  });

  describe("isFavorite", () => {
    it("returns true for favorite status", () => {
      const entries = [makeEntry({ status: "favorite" })];
      expect(isFavorite(entries, 1)).toBe(true);
    });

    it("returns true for favorite_completed status", () => {
      const entries = [makeEntry({ status: "favorite_completed" })];
      expect(isFavorite(entries, 1)).toBe(true);
    });

    it("returns false for completed status", () => {
      const entries = [makeEntry({ status: "completed" })];
      expect(isFavorite(entries, 1)).toBe(false);
    });

    it("returns false when workId not found", () => {
      expect(isFavorite([], 1)).toBe(false);
    });
  });

  describe("updateReadingPosition", () => {
    it("updates position for favorite entries", () => {
      addFavorite(1, "冒頭", 0, 0);
      const result = updateReadingPosition(1, 5, 5);
      expect(result[0].lastProgress).toBe(5);
      expect(result[0].lastViewPosition).toBe(5);
    });

    it("does nothing for completed entries", () => {
      addCompleted(1, "タイトル", "著者", "冒頭", 60000, 10);
      const result = updateReadingPosition(1, 5, 5);
      expect(result[0].lastProgress).toBeNull();
    });

    it("does nothing for favorite_completed entries", () => {
      const entries = [
        makeEntry({
          status: "favorite_completed",
          title: "タイトル",
          author: "著者",
          lastProgress: null,
          lastViewPosition: null,
        }),
      ];
      saveBookshelf(entries);
      const result = updateReadingPosition(1, 5, 5);
      expect(result[0].lastProgress).toBeNull();
      expect(result[0].lastViewPosition).toBeNull();
    });

    it("does nothing for non-existent entries", () => {
      const result = updateReadingPosition(999, 5, 5);
      expect(result).toEqual([]);
    });
  });
});
