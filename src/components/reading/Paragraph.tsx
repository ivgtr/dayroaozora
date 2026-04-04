import { forwardRef } from "react";
import type { Sentence, InlineNode } from "@/types";
import { sliceInlineNodes } from "@/lib/aozora";
import { renderNodes } from "./renderNodes";
import TypewriterText from "./TypewriterText";
import styles from "./Paragraph.module.css";

interface ParagraphProps {
  sentences: Sentence[];
  paragraphIndex: number;
  visibleCount: number;
  distance: number;
  typewriterContent?: { displayedChars: number; isAnimating: boolean };
}

const Paragraph = forwardRef<HTMLParagraphElement, ParagraphProps>(
  function Paragraph(
    { sentences, paragraphIndex, visibleCount, distance, typewriterContent },
    ref,
  ) {
    if (visibleCount <= 0) return null;

    const dataDistance =
      distance <= 0 ? "0" : distance >= 3 ? "3" : String(distance);

    const confirmedCount = typewriterContent
      ? visibleCount - 1
      : visibleCount;

    // 確定済み文のノードを連結
    const confirmedNodes: InlineNode[] = [];
    for (let i = 0; i < confirmedCount; i++) {
      confirmedNodes.push(...sentences[i].nodes);
    }

    // タイプライター対象の文
    let typewriterNodes: InlineNode[] | null = null;
    if (typewriterContent && visibleCount > 0) {
      const twSentence = sentences[visibleCount - 1];
      typewriterNodes = sliceInlineNodes(
        twSentence.nodes,
        typewriterContent.displayedChars,
      );
    }

    return (
      <p
        ref={ref}
        className={styles.paragraph}
        data-distance={dataDistance}
        data-paragraph-index={paragraphIndex}
      >
        {renderNodes(confirmedNodes)}
        {typewriterNodes ? (
          <TypewriterText
            nodes={typewriterNodes}
            isAnimating={typewriterContent!.isAnimating}
          />
        ) : null}
      </p>
    );
  },
);

export default Paragraph;
