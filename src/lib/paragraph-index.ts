import type { Paragraph } from "@/types";

export interface ParagraphPosition {
  paragraphIndex: number;
  sentenceOffset: number;
}

/** フラット sentence index → 段落内の位置に変換 */
export function flatToParagraphPos(
  paragraphs: Paragraph[],
  flatIndex: number,
): ParagraphPosition {
  for (let pi = paragraphs.length - 1; pi >= 0; pi--) {
    if (flatIndex >= paragraphs[pi].startIndex) {
      return {
        paragraphIndex: pi,
        sentenceOffset: flatIndex - paragraphs[pi].startIndex,
      };
    }
  }
  return { paragraphIndex: 0, sentenceOffset: 0 };
}

/** 2つの段落インデックス間の距離を算出（双方向、最大3にクランプ） */
export function paragraphDistance(
  focusParagraphIndex: number,
  paragraphIndex: number,
): number {
  return Math.min(Math.abs(focusParagraphIndex - paragraphIndex), 3);
}
