"use client";

import { useState } from "react";
import type { BookshelfEntry } from "@/types";
import BookshelfCard from "./BookshelfCard";
import EmptyBookshelf from "./EmptyBookshelf";
import styles from "./BookshelfGrid.module.css";

interface BookshelfGridProps {
  entries: BookshelfEntry[];
  onDelete: (workId: number) => void;
  onRemoveFavorite: (workId: number) => void;
  onCardClick: (workId: number) => void;
}

export default function BookshelfGrid({
  entries,
  onDelete,
  onRemoveFavorite,
  onCardClick,
}: BookshelfGridProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (entries.length === 0) {
    return <EmptyBookshelf />;
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <button
          className={styles.editButton}
          type="button"
          aria-pressed={isEditing}
          aria-label={isEditing ? "編集を完了する" : "編集する"}
          onClick={() => setIsEditing((prev) => !prev)}
        >
          {isEditing ? "完了" : "編集"}
        </button>
      </div>
      <div className={styles.grid}>
        {entries.map((entry) => (
          <BookshelfCard
            key={entry.workId}
            entry={entry}
            isEditing={isEditing}
            onDelete={onDelete}
            onRemoveFavorite={onRemoveFavorite}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}
