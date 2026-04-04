import type { InlineNode } from "@/types";
import { renderNodes } from "./renderNodes";
import styles from "./TypewriterText.module.css";

interface TypewriterTextProps {
  nodes: InlineNode[];
  isAnimating: boolean;
}

export default function TypewriterText({
  nodes,
  isAnimating,
}: TypewriterTextProps) {
  return (
    <span className={styles.text}>
      {renderNodes(nodes)}
      {isAnimating && <span className={styles.cursor} />}
    </span>
  );
}
