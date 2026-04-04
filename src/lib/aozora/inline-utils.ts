import type { InlineNode } from "./types";

/** InlineNode[] からプレーンテキストを抽出（ruby は base のみ） */
export function textFromNodes(nodes: InlineNode[]): string {
  return nodes
    .map((n) => (n.type === "ruby" ? n.base : n.text))
    .join("");
}

/** InlineNode[] を charCount 文字分だけ切り出す（タイプライター用） */
export function sliceInlineNodes(
  nodes: InlineNode[],
  charCount: number,
): InlineNode[] {
  if (charCount <= 0) return [];

  const result: InlineNode[] = [];
  let remaining = charCount;

  for (const node of nodes) {
    if (remaining <= 0) break;

    if (node.type === "ruby") {
      // ruby はアトミック: base 全体を表示するか、しないか
      if (remaining >= node.base.length) {
        result.push(node);
        remaining -= node.base.length;
      } else {
        break;
      }
    } else {
      // text / emphasis / bold: 文字単位で���断可能
      const len = node.text.length;
      if (remaining >= len) {
        result.push(node);
        remaining -= len;
      } else {
        result.push({ ...node, text: node.text.slice(0, remaining) });
        remaining = 0;
      }
    }
  }

  return result;
}

interface SentenceSlice {
  nodes: InlineNode[];
  text: string;
}

/** InlineNode[] を句点（。）の位置で分割する */
export function splitNodesAtPeriod(nodes: InlineNode[]): SentenceSlice[] {
  const sentences: SentenceSlice[] = [];
  let currentNodes: InlineNode[] = [];

  for (const node of nodes) {
    if (node.type === "ruby") {
      // ruby の base に句点は含まれない（CJK文字のみ）
      currentNodes.push(node);
      continue;
    }

    // text / emphasis / bold: 句点で分割
    const text = node.text;
    let start = 0;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === "。") {
        const part = text.slice(start, i + 1);
        if (part) {
          currentNodes.push({ ...node, text: part });
        }
        // この文を確定
        if (currentNodes.length > 0) {
          sentences.push({
            nodes: currentNodes,
            text: textFromNodes(currentNodes),
          });
          currentNodes = [];
        }
        start = i + 1;
      }
    }

    // 残りのテキスト
    if (start < text.length) {
      const remaining = text.slice(start);
      if (remaining) {
        currentNodes.push({ ...node, text: remaining });
      }
    }
  }

  // 最後のバッファをフラッシュ
  if (currentNodes.length > 0) {
    const text = textFromNodes(currentNodes);
    if (text.trim()) {
      sentences.push({ nodes: currentNodes, text });
    }
  }

  return sentences;
}
