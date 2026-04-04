import type { StreakData } from "@/types";
import ShareButtons from "@/components/share/ShareButtons";
import styles from "./CompletionScreen.module.css";

interface CompletionScreenProps {
  title: string;
  author: string;
  readingTime: number;
  tapCount: number;
  streak: StreakData | null;
  isBookshelfReread: boolean;
}

export default function CompletionScreen({
  title,
  author,
  readingTime,
  tapCount,
  streak,
  isBookshelfReread,
}: CompletionScreenProps) {
  const minutes = Math.max(1, Math.round(readingTime / 60000));
  const showStreak =
    !isBookshelfReread && streak !== null && streak.current >= 2;

  return (
    <div className={styles.container} aria-live="polite">
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.author}>{author}</p>

        <div className={styles.stats}>
          <span>{minutes}分</span>
          <span className={styles.separator}>·</span>
          <span>{tapCount}タップ</span>
        </div>

        {showStreak && (
          <p className={styles.streak}>🔥 {streak.current}日連続</p>
        )}

        <ShareButtons
          title={title}
          author={author}
          readingTime={readingTime}
          tapCount={tapCount}
          streak={streak?.current ?? 0}
          isBookshelfReread={isBookshelfReread}
        />
      </div>
    </div>
  );
}
