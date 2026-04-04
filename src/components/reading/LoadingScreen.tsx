import styles from "./LoadingScreen.module.css";

interface LoadingScreenProps {
  fadeOut: boolean;
  onTransitionEnd: () => void;
}

export default function LoadingScreen({
  fadeOut,
  onTransitionEnd,
}: LoadingScreenProps) {
  const className = fadeOut
    ? `${styles.screen} ${styles.fadeOut}`
    : styles.screen;

  return (
    <div className={className} onTransitionEnd={onTransitionEnd}>
      <p className={styles.text}>毎日、青空文庫をお届け</p>
    </div>
  );
}
