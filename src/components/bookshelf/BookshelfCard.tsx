"use client";

import type { ReactNode } from "react";
import type { BookshelfEntry } from "@/types";
import {
  HeartIcon,
  HeartFilledIcon,
  CheckIcon,
  CloseIcon,
} from "@/components/icons";
import styles from "./BookshelfCard.module.css";

interface BookshelfCardProps {
  entry: BookshelfEntry;
  isEditing: boolean;
  onDelete: (workId: number) => void;
  onToggleFavorite: (workId: number) => void;
  onClick: (workId: number) => void;
}

const STATUS_LABELS: Record<BookshelfEntry["status"], string> = {
  favorite: "お気に入り",
  completed: "読了",
  favorite_completed: "お気に入り・読了",
};

const STATUS_ICONS: Record<BookshelfEntry["status"], ReactNode> = {
  favorite: <HeartIcon size="1em" />,
  completed: <CheckIcon size="1em" />,
  favorite_completed: (
    <>
      <HeartIcon size="1em" />
      <CheckIcon size="1em" />
    </>
  ),
};

function formatDate(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function BookshelfCard({
  entry,
  isEditing,
  onDelete,
  onToggleFavorite,
  onClick,
}: BookshelfCardProps) {
  const isFav =
    entry.status === "favorite" || entry.status === "favorite_completed";
  const displayDate = entry.completedAt ?? entry.favoriteAt;
  const tooltip = [
    entry.title ?? entry.firstLine,
    entry.author,
    STATUS_LABELS[entry.status],
    formatDate(displayDate),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className={`${styles.book}${isEditing ? ` ${styles.bookEditing}` : ""}`}
      onClick={isEditing ? undefined : () => onClick(entry.workId)}
      onKeyDown={
        isEditing
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(entry.workId);
              }
            }
      }
      role={isEditing ? undefined : "button"}
      tabIndex={isEditing ? undefined : 0}
      aria-label={isEditing ? undefined : (entry.title ?? entry.firstLine)}
      title={tooltip}
    >
      <div className={styles.cover}>
        {entry.title ? (
          <p className={styles.title}>{entry.title}</p>
        ) : (
          <p className={styles.firstLine}>{entry.firstLine}</p>
        )}
        {entry.author && <p className={styles.author}>{entry.author}</p>}
      </div>

      <span
        className={styles.badge}
        role="img"
        aria-label={STATUS_LABELS[entry.status]}
      >
        {STATUS_ICONS[entry.status]}
      </span>

      {isEditing && (
        <div className={styles.editOverlay}>
          <button
            className={`${styles.favButton}${isFav ? ` ${styles.favButtonActive}` : ""}`}
            type="button"
            aria-label={
              isFav ? "お気に入りを解除" : "お気に入りに追加"
            }
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(entry.workId);
            }}
          >
            {isFav ? (
              <HeartFilledIcon size="1.125em" />
            ) : (
              <HeartIcon size="1.125em" />
            )}
          </button>
          <button
            className={styles.deleteButton}
            type="button"
            aria-label={`${entry.title ?? entry.firstLine}を削除`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.workId);
            }}
          >
            <CloseIcon size="1em" />
          </button>
        </div>
      )}
    </div>
  );
}
