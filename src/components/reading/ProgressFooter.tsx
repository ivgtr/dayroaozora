import styles from "./ProgressFooter.module.css";

interface ProgressFooterProps {
  progress: number;
  totalSentences: number;
  remainingChars: number;
  viewPosition: number;
}

export default function ProgressFooter({
  progress,
  totalSentences,
  remainingChars,
  viewPosition,
}: ProgressFooterProps) {
  const lastIndex = totalSentences - 1;
  const isAtEnd = progress === lastIndex && viewPosition === lastIndex;

  if (isAtEnd) {
    return (
      <footer className={styles.footer}>
        <div className={styles.completionHint}>タップで読了</div>
      </footer>
    );
  }

  const widthPercent = totalSentences > 0 ? ((progress + 1) / totalSentences) * 100 : 0;
  const remainingMinutes = Math.ceil(remainingChars / 500);
  const timeLabel = remainingMinutes > 0 ? `約${remainingMinutes}分` : "まもなく";

  return (
    <footer className={styles.footer}>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          style={{ width: `${widthPercent}%` }}
          role="progressbar"
          aria-label="読書進捗"
          aria-valuenow={progress + 1}
          aria-valuemin={0}
          aria-valuemax={totalSentences}
          aria-valuetext={`${progress + 1} / ${totalSentences} 文、残り${timeLabel}`}
        />
      </div>
      <div className={styles.time}>{timeLabel}</div>
    </footer>
  );
}
