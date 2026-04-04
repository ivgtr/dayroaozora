"use client";

import { useRouter } from "next/navigation";
import { useBookshelf } from "@/hooks/useBookshelf";
import BookshelfGrid from "@/components/bookshelf/BookshelfGrid";
import styles from "./page.module.css";

export default function BookshelfPage() {
  const router = useRouter();
  const { entries, removeEntry, removeFavorite } = useBookshelf();

  const handleCardClick = (workId: number) => {
    router.push(`/?source=bookshelf&workId=${workId}`);
  };

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
      </header>
      <BookshelfGrid
        entries={entries}
        onDelete={removeEntry}
        onRemoveFavorite={removeFavorite}
        onCardClick={handleCardClick}
      />
    </div>
  );
}
