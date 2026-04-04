import { forwardRef } from "react";
import type { StreakData } from "@/types";
import { FlameIcon } from "@/components/icons";
import ShareButtons from "@/components/share/ShareButtons";
import styles from "./CompletionSection.module.css";

interface CompletionSectionProps {
  title: string;
  author: string;
  readingTime: number;
  tapCount: number;
  streak: StreakData | null;
  isBookshelfReread: boolean;
  paragraphIndex: number;
}

const CompletionSection = forwardRef<HTMLElement, CompletionSectionProps>(
  function CompletionSection(
    { title, author, readingTime, tapCount, streak, isBookshelfReread, paragraphIndex },
    ref,
  ) {
    const minutes = Math.max(1, Math.round(readingTime / 60000));
    const showStreak =
      !isBookshelfReread && streak !== null && streak.current >= 2;

    return (
      <section
        ref={ref}
        className={styles.container}
        aria-live="polite"
        data-paragraph-index={paragraphIndex}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.author}>{author}</p>

        <div className={styles.stats}>
          <span>{minutes}分</span>
          <span className={styles.separator}>·</span>
          <span>{tapCount}タップ</span>
        </div>

        {showStreak && (
          <p className={styles.streak}>
            <FlameIcon size="1em" className={styles.streakIcon} />{" "}
            {streak.current}日連続
          </p>
        )}

        <ShareButtons
          title={title}
          author={author}
          readingTime={readingTime}
          tapCount={tapCount}
          streak={streak?.current ?? 0}
          isBookshelfReread={isBookshelfReread}
        />
      </section>
    );
  },
);

export default CompletionSection;
