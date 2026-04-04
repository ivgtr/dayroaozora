import type { Paragraph, Sentence, ContentBlock } from "@/types";
import { splitNodesAtPeriod, textFromNodes } from "@/lib/aozora";

/**
 * ContentBlock[] を Paragraph[] に変換する。
 *
 * - paragraph ブロック + 句点あり → splitNodesAtPeriod で文分割 → 1 Paragraph
 * - paragraph ブロック + 句点なし → 1文1段落
 * - heading ブロック → 1文1段落
 * - separator → スキップ
 */
export function blocksToParagraphs(blocks: ContentBlock[]): Paragraph[] {
  const result: Paragraph[] = [];
  let flatIndex = 0;

  for (const block of blocks) {
    if (block.type === "separator") {
      continue;
    }

    if (block.type === "heading") {
      const sentence: Sentence = {
        nodes: [{ type: "text", text: block.text }],
        text: block.text,
      };
      result.push({ sentences: [sentence], startIndex: flatIndex });
      flatIndex += 1;
      continue;
    }

    // paragraph block
    if (block.text.includes("。")) {
      const sentences = splitNodesAtPeriod(block.nodes).map((s) => ({
        nodes: s.nodes,
        text: s.text,
      }));
      if (sentences.length > 0) {
        result.push({ sentences, startIndex: flatIndex });
        flatIndex += sentences.length;
      }
    } else {
      const text = textFromNodes(block.nodes);
      if (text.trim()) {
        const sentence: Sentence = { nodes: block.nodes, text };
        result.push({ sentences: [sentence], startIndex: flatIndex });
        flatIndex += 1;
      }
    }
  }

  return result;
}
