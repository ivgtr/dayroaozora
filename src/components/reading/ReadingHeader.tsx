"use client";

import { useRouter } from "next/navigation";
import { BookOpenIcon, InfoIcon, HeartIcon, HeartFilledIcon, MoonIcon, SunIcon, ArrowLeftIcon } from "@/components/icons";
import styles from "./ReadingHeader.module.css";

interface ReadingHeaderProps {
  mode?: "daily" | "bookshelf";
  theme?: "light" | "dark";
  isFavorite?: boolean;
  onFavoriteAdd?: () => void;
  onThemeToggle?: () => void;
  onInfoOpen?: () => void;
}

export default function ReadingHeader({
  mode = "daily",
  theme = "light",
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
          <BookOpenIcon />
        </button>
      ) : (
        <button
          className={`${styles.button} ${styles.buttonFirst} ${styles.backButton}`}
          type="button"
          aria-label="本棚に戻る"
          onClick={() => router.push("/bookshelf")}
        >
          <ArrowLeftIcon size="0.875em" /> 本棚
        </button>
      )}
      <button className={styles.button} type="button" aria-label="情報" onClick={onInfoOpen}>
        <InfoIcon />
      </button>
      {mode === "daily" && (
        <button
          className={styles.button}
          type="button"
          aria-label={isFavorite ? "お気に入り済み" : "お気に入りに追加"}
          onClick={onFavoriteAdd}
        >
          <span className={isFavorite ? styles.favoriteActive : undefined}>
            {isFavorite ? <HeartFilledIcon /> : <HeartIcon />}
          </span>
        </button>
      )}
      <button className={styles.button} type="button" aria-label="テーマ切替" onClick={onThemeToggle}>
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
