"use client";

import type { BookshelfEntry } from "@/types";
import BookshelfCard from "./BookshelfCard";
import EmptyBookshelf from "./EmptyBookshelf";
import styles from "./BookshelfGrid.module.css";

interface BookshelfGridProps {
  entries: BookshelfEntry[];
  isEditing: boolean;
  onDelete: (workId: number) => void;
  onToggleFavorite: (workId: number) => void;
  onCardClick: (workId: number) => void;
}

export default function BookshelfGrid({
  entries,
  isEditing,
  onDelete,
  onToggleFavorite,
  onCardClick,
}: BookshelfGridProps) {
  if (entries.length === 0) {
    return <EmptyBookshelf />;
  }

  return (
    <div className={styles.grid}>
      {entries.map((entry) => (
        <BookshelfCard
          key={entry.workId}
          entry={entry}
          isEditing={isEditing}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
