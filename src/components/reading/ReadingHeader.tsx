"use client";

import { useRouter } from "next/navigation";
import styles from "./ReadingHeader.module.css";

interface ReadingHeaderProps {
  mode?: "daily" | "bookshelf";
  isFavorite?: boolean;
  onFavoriteAdd?: () => void;
  onThemeToggle?: () => void;
  onInfoOpen?: () => void;
}

export default function ReadingHeader({
  mode = "daily",
  isFavorite = false,
  onFavoriteAdd,
  onThemeToggle,
  onInfoOpen,
}: ReadingHeaderProps) {
  const router = useRouter();

  return (
    <header className={styles.header}>
      {mode === "daily" ? (
        <button
          className={`${styles.button} ${styles.buttonFirst}`}
          type="button"
          aria-label="本棚"
          onClick={() => router.push("/bookshelf")}
        >
          <span aria-hidden="true">📚</span>
        </button>
      ) : (
        <button
          className={`${styles.button} ${styles.buttonFirst}`}
          type="button"
          aria-label="本棚に戻る"
          onClick={() => router.push("/bookshelf")}
        >
          <span aria-hidden="true">← 本棚</span>
        </button>
      )}
      <button className={styles.button} type="button" aria-label="情報" onClick={onInfoOpen}>
        <span aria-hidden="true">ℹ️</span>
      </button>
      {mode === "daily" && (
        <button
          className={styles.button}
          type="button"
          aria-label={isFavorite ? "お気に入り済み" : "お気に入りに追加"}
          onClick={onFavoriteAdd}
        >
          <span aria-hidden="true" className={isFavorite ? styles.favoriteActive : undefined}>
            {isFavorite ? "♥" : "♡"}
          </span>
        </button>
      )}
      <button className={styles.button} type="button" aria-label="テーマ切替" onClick={onThemeToggle}>
        <span aria-hidden="true">🌓</span>
      </button>
    </header>
  );
}
