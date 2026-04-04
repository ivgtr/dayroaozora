import { forwardRef, memo } from "react";
import type { Sentence, InlineNode } from "@/types";
import type { TypewriterController } from "@/hooks/useTypewriter";
import { renderNodes } from "./renderNodes";
import TypewriterText from "./TypewriterText";
import styles from "./Paragraph.module.css";

interface ParagraphProps {
  sentences: Sentence[];
  paragraphIndex: number;
  visibleCount: number;
  distance: number;
  typewriterController?: TypewriterController;
}

const Paragraph = memo(
  forwardRef<HTMLParagraphElement, ParagraphProps>(function Paragraph(
    { sentences, paragraphIndex, visibleCount, distance, typewriterController },
    ref,
  ) {
    if (visibleCount <= 0) return null;

    const dataDistance =
      distance <= 0 ? "0" : distance >= 3 ? "3" : String(distance);

    const confirmedCount = typewriterController
      ? visibleCount - 1
      : visibleCount;

    const confirmedNodes: InlineNode[] = [];
    for (let i = 0; i < confirmedCount; i++) {
      confirmedNodes.push(...sentences[i].nodes);
    }

    return (
      <p
        ref={ref}
        className={styles.paragraph}
        data-distance={dataDistance}
        data-paragraph-index={paragraphIndex}
      >
        {renderNodes(confirmedNodes)}
        {typewriterController && visibleCount > 0 ? (
          <TypewriterText
            nodes={sentences[visibleCount - 1].nodes}
            controller={typewriterController}
          />
        ) : null}
      </p>
    );
  }),
);

export default Paragraph;
