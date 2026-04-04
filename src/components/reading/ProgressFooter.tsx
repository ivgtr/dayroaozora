import styles from "./ProgressFooter.module.css";

interface ProgressFooterProps {
  progress: number;
  totalSentences: number;
  remainingChars: number;
}

export default function ProgressFooter({
  progress,
  totalSentences,
  remainingChars,
}: ProgressFooterProps) {
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
          aria-valuenow={progress + 1}
          aria-valuemin={0}
          aria-valuemax={totalSentences}
        />
      </div>
      <div className={styles.time}>{timeLabel}</div>
    </footer>
  );
}
