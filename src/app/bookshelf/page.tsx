"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBookshelf } from "@/hooks/useBookshelf";
import BookshelfGrid from "@/components/bookshelf/BookshelfGrid";
import styles from "./page.module.css";

interface PendingAction {
  type: "delete" | "removeFavorite";
  workId: number;
  label: string;
}

export default function BookshelfPage() {
  const router = useRouter();
  const { entries, removeEntry, removeFavorite, addFavorite } = useBookshelf();
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  useEffect(() => {
    if (!pendingAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingAction(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingAction]);

  const handleCardClick = (workId: number) => {
    router.push(`/?source=bookshelf&workId=${workId}`);
  };

  const handleRequestDelete = (workId: number) => {
    const entry = entries.find((e) => e.workId === workId);
    if (!entry) return;
    setPendingAction({
      type: "delete",
      workId,
      label: entry.title ?? entry.firstLine,
    });
  };

  const handleToggleFavorite = (workId: number) => {
    const entry = entries.find((e) => e.workId === workId);
    if (!entry) return;

    const isFav =
      entry.status === "favorite" || entry.status === "favorite_completed";

    if (isFav) {
      setPendingAction({
        type: "removeFavorite",
        workId,
        label: entry.title ?? entry.firstLine,
      });
    } else {
      addFavorite(workId, entry.firstLine, 0, 0);
    }
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "delete") {
      removeEntry(pendingAction.workId);
    } else {
      removeFavorite(pendingAction.workId);
    }
    setPendingAction(null);
  };

  const handleCancel = () => {
    setPendingAction(null);
  };

  const dialogMessage =
    pendingAction?.type === "delete"
      ? `「${pendingAction.label}」を本棚から削除しますか？`
      : `「${pendingAction?.label}」のお気に入りを解除しますか？`;

  const dialogConfirmLabel =
    pendingAction?.type === "delete" ? "削除する" : "解除する";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          type="button"
          aria-label="戻る"
          onClick={() => router.push("/")}
        >
          ← 戻る
        </button>
        <h1 className={styles.title}>本棚</h1>
        {entries.length > 0 ? (
          <button
            className={styles.editButton}
            type="button"
            aria-pressed={isEditing}
            aria-label={isEditing ? "編集を完了する" : "編集する"}
            onClick={() => setIsEditing((prev) => !prev)}
          >
            {isEditing ? "完了" : "編集"}
          </button>
        ) : (
          <span className={styles.headerSpacer} />
        )}
      </header>

      <BookshelfGrid
        entries={entries}
        isEditing={isEditing}
        onDelete={handleRequestDelete}
        onToggleFavorite={handleToggleFavorite}
        onCardClick={handleCardClick}
      />

      {pendingAction && (
        <div
          className={styles.dialogBackdrop}
          onClick={handleCancel}
          role="presentation"
        >
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-label="確認"
            onClick={(e) => e.stopPropagation()}
          >
            <p className={styles.dialogMessage}>{dialogMessage}</p>
            <div className={styles.dialogActions}>
              <button
                className={styles.dialogCancel}
                type="button"
                onClick={handleCancel}
              >
                キャンセル
              </button>
              <button
                className={styles.dialogConfirm}
                type="button"
                onClick={handleConfirm}
              >
                {dialogConfirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
