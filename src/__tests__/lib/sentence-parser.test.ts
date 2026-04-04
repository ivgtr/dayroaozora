import { describe, it, expect } from "vitest";
import { blocksToParagraphs } from "@/lib/sentence-parser";
import { parseStructured } from "@/lib/aozora";
import type { ContentBlock } from "@/types";

/** ヘルパー: プレーンテキストから ContentBlock[] を生成 */
function textToBlocks(text: string): ContentBlock[] {
  // parseStructured は raw テキスト用。テスト用に簡易的に行をブロックに変換
  const lines = text.split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === "") {
      let blankCount = 0;
      while (i < lines.length && lines[i].trim() === "") {
        blankCount++;
        i++;
      }
      if (blankCount >= 2) {
        blocks.push({ type: "separator" });
      }
      continue;
    }
    const text = lines[i];
    blocks.push({
      type: "paragraph",
      text,
      nodes: [{ type: "text", text }],
    });
    i++;
  }
  return blocks;
}

describe("blocksToParagraphs", () => {
  it("句点で文を分割する", () => {
    const blocks = textToBlocks("太郎は走った。花子は笑った。");
    const result = blocksToParagraphs(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].sentences).toHaveLength(2);
    expect(result[0].sentences[0].text).toBe("太郎は走った。");
    expect(result[0].sentences[1].text).toBe("花子は笑った。");
    expect(result[0].startIndex).toBe(0);
  });

  it("句点なしの行は1文1段落", () => {
    const blocks = textToBlocks("春の海\nひねもすのたり\nのたりかな");
    const result = blocksToParagraphs(blocks);
    expect(result).toHaveLength(3);
    expect(result[0].sentences[0].text).toBe("春の海");
    expect(result[1].sentences[0].text).toBe("ひねもすのたり");
    expect(result[2].sentences[0].text).toBe("のたりかな");
  });

  it("separator をスキップする", () => {
    const blocks = textToBlocks("段落一。\n\n\n段落二。");
    const result = blocksToParagraphs(blocks);
    expect(result).toHaveLength(2);
    expect(result[0].sentences[0].text).toBe("段落一。");
    expect(result[1].sentences[0].text).toBe("段落二。");
  });

  it("startIndex が正しく積み上がる", () => {
    const blocks = textToBlocks("太郎は走った。花子は笑った。\n\n\n次の日。");
    const result = blocksToParagraphs(blocks);
    expect(result[0].startIndex).toBe(0);
    expect(result[0].sentences).toHaveLength(2);
    expect(result[1].startIndex).toBe(2);
  });

  it("空の blocks は空配列を返す", () => {
    expect(blocksToParagraphs([])).toEqual([]);
  });

  it("heading ブロックを1文1段落にする", () => {
    const blocks: ContentBlock[] = [
      { type: "heading", level: 1, text: "タイトル" },
    ];
    const result = blocksToParagraphs(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].sentences[0].text).toBe("タイトル");
  });

  it("InlineNode でルビを含む文を分割する", () => {
    const blocks: ContentBlock[] = [
      {
        type: "paragraph",
        text: "太郎は走った。花子は笑った。",
        nodes: [
          { type: "text", text: "太郎は" },
          { type: "ruby", base: "走", reading: "はし" },
          { type: "text", text: "った。花子は" },
          { type: "ruby", base: "笑", reading: "わら" },
          { type: "text", text: "った。" },
        ],
      },
    ];
    const result = blocksToParagraphs(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].sentences).toHaveLength(2);
    expect(result[0].sentences[0].text).toBe("太郎は走った。");
    expect(result[0].sentences[1].text).toBe("花子は笑った。");
    // ルビノードが正しく分配されている
    expect(result[0].sentences[0].nodes).toContainEqual({
      type: "ruby", base: "走", reading: "はし",
    });
    expect(result[0].sentences[1].nodes).toContainEqual({
      type: "ruby", base: "笑", reading: "わら",
    });
  });
});

describe("parseStructured integration", () => {
  it("raw テキストをパースして段落構造を作れる", () => {
    const raw = "太郎は走った。花子は笑った。\n次の行。";
    const structured = parseStructured(raw);
    const paragraphs = blocksToParagraphs(structured.blocks);

    // 各行が別ブロックになり、句点で文分割される
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(paragraphs[0].sentences[0].text).toBe("太郎は走った。");
  });
});
