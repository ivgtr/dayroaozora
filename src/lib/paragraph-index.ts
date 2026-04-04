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

/** 段落 index と viewPosition (フラット) から段落間の距離を算出 */
export function paragraphDistance(
  paragraphs: Paragraph[],
  paragraphIndex: number,
  flatViewPosition: number,
): number {
  const viewParaIndex = flatToParagraphPos(
    paragraphs,
    flatViewPosition,
  ).paragraphIndex;
  const distance = viewParaIndex - paragraphIndex;
  if (distance <= 0) return 0;
  return Math.min(distance, 3);
}
