import { forwardRef } from "react";
import styles from "./Sentence.module.css";

interface SentenceProps {
  text: string;
  index: number;
  viewPosition: number;
  progress: number;
  children?: React.ReactNode;
}

const Sentence = forwardRef<HTMLParagraphElement, SentenceProps>(
  function Sentence({ text, index, viewPosition, progress, children }, ref) {
    if (index > progress) {
      return null;
    }

    const distance = viewPosition - index;
    const dataDistance =
      distance <= 0 ? "0" : distance >= 3 ? "3" : String(distance);

    return (
      <p
        ref={ref}
        className={styles.sentence}
        data-distance={dataDistance}
        data-sentence-index={index}
      >
        {children ?? text}
      </p>
    );
  },
);

export default Sentence;
