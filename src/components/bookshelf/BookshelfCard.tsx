"use client";

import type { ReactNode } from "react";
import type { BookshelfEntry } from "@/types";
import { HeartIcon, CheckIcon, CloseIcon } from "@/components/icons";
import styles from "./BookshelfCard.module.css";

interface BookshelfCardProps {
  entry: BookshelfEntry;
  isEditing: boolean;
  onDelete: (workId: number) => void;
  onRemoveFavorite: (workId: number) => void;
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
  favorite_completed: <><HeartIcon size="1em" /><CheckIcon size="1em" /></>,
};

function StatusBadge({ status }: { status: BookshelfEntry["status"] }) {
  return (
    <span className={styles.badge} role="img" aria-label={STATUS_LABELS[status]}>
      {STATUS_ICONS[status]}
    </span>
  );
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function BookshelfCard({
  entry,
  isEditing,
  onDelete,
  onRemoveFavorite,
  onClick,
}: BookshelfCardProps) {
  const displayDate = entry.completedAt ?? entry.favoriteAt;
  const isFav = entry.status === "favorite" || entry.status === "favorite_completed";

  return (
    <div
      className={`${styles.card}${isEditing ? ` ${styles.cardEditing}` : ""}`}
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
    >
      <div className={styles.content}>
        {entry.title ? (
          <p className={styles.title}>{entry.title}</p>
        ) : (
          <p className={styles.firstLine}>{entry.firstLine}</p>
        )}
        {entry.author && <p className={styles.author}>{entry.author}</p>}
      </div>

      <div className={styles.meta}>
        <StatusBadge status={entry.status} />
        <span className={styles.date}>{formatDate(displayDate)}</span>
      </div>

      {isEditing && (
        <div className={styles.editOverlay}>
          <button
            className={styles.deleteButton}
            type="button"
            aria-label={`${entry.title ?? entry.firstLine}を削除`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.workId);
            }}
          >
            <CloseIcon size="0.75em" />
          </button>
          {isFav && (
            <button
              className={styles.unfavButton}
              type="button"
              aria-label={`${entry.title ?? entry.firstLine}のお気に入りを解除`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(entry.workId);
              }}
            >
              <span className={styles.unfavIcon}><HeartIcon size="0.75em" /></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
