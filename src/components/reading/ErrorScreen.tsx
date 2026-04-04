import styles from "./ErrorScreen.module.css";

interface ErrorScreenProps {
  onRetry: () => void;
}

export default function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.message} role="alert">
          読み込みに失敗しました
        </p>
        <button className={styles.retryButton} type="button" onClick={onRetry}>
          再試行
        </button>
        <a className={styles.bookshelfLink} href="/bookshelf">
          本棚を見る
        </a>
      </div>
    </div>
  );
}
