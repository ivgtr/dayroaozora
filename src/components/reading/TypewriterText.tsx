import styles from "./TypewriterText.module.css";

interface TypewriterTextProps {
  displayedText: string;
  isAnimating: boolean;
}

export default function TypewriterText({
  displayedText,
  isAnimating,
}: TypewriterTextProps) {
  return (
    <span className={styles.text}>
      {displayedText}
      {isAnimating && <span className={styles.cursor} />}
    </span>
  );
}
