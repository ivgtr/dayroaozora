import { useState, useCallback } from "react";
import type { BookshelfEntry } from "@/types";
import {
  loadBookshelf,
  addFavorite as addFav,
  addCompleted as addComp,
  removeEntry as removeEnt,
  removeFavorite as removeFav,
  isFavorite as checkFavorite,
  updateReadingPosition as updatePos,
} from "@/lib/bookshelf";

export function useBookshelf() {
  const [entries, setEntries] = useState<BookshelfEntry[]>(() => {
    if (typeof window === "undefined") return [];
    return loadBookshelf();
  });

  const addFavorite = useCallback(
    (workId: number, firstLine: string, progress: number, viewPosition: number) => {
      const updated = addFav(workId, firstLine, progress, viewPosition);
      setEntries(updated);
    },
    [],
  );

  const addCompleted = useCallback(
    (workId: number, title: string, author: string, firstLine: string, readingTime: number, tapCount: number) => {
      const updated = addComp(workId, title, author, firstLine, readingTime, tapCount);
      setEntries(updated);
    },
    [],
  );

  const removeEntry = useCallback((workId: number) => {
    const updated = removeEnt(workId);
    setEntries(updated);
  }, []);

  const removeFavorite = useCallback((workId: number) => {
    const updated = removeFav(workId);
    setEntries(updated);
  }, []);

  const isFavorite = useCallback(
    (workId: number) => checkFavorite(entries, workId),
    [entries],
  );

  const updateReadingPosition = useCallback(
    (workId: number, progress: number, viewPosition: number) => {
      const updated = updatePos(workId, progress, viewPosition);
      setEntries(updated);
    },
    [],
  );

  return {
    entries,
    addFavorite,
    addCompleted,
    removeEntry,
    removeFavorite,
    isFavorite,
    updateReadingPosition,
  };
}
