import styles from "./ReadingHeader.module.css";

export default function ReadingHeader() {
  return (
    <header className={styles.header}>
      <button
        className={`${styles.button} ${styles.buttonFirst}`}
        type="button"
        aria-label="本棚"
      >
        <span aria-hidden="true">📚</span>
      </button>
      <button className={styles.button} type="button" aria-label="情報">
        <span aria-hidden="true">ℹ️</span>
      </button>
      <button className={styles.button} type="button" aria-label="お気に入り">
        <span aria-hidden="true">♡</span>
      </button>
      <button className={styles.button} type="button" aria-label="テーマ切替">
        <span aria-hidden="true">🌓</span>
      </button>
    </header>
  );
}
