import { describe, it, expect } from "vitest";
import type { Paragraph } from "@/types";
import { flatToParagraphPos, paragraphDistance } from "@/lib/paragraph-index";

function s(text: string) {
  return { nodes: [{ type: "text" as const, text }], text };
}

const sampleParagraphs: Paragraph[] = [
  { sentences: [s("太郎は走った。"), s("花子は笑った。")], startIndex: 0 },
  {
    sentences: [s("次の日。"), s("朝が来た。"), s("鳥が鳴いた。")],
    startIndex: 2,
  },
  { sentences: [s("終わり。")], startIndex: 5 },
];

describe("flatToParagraphPos", () => {
  it("最初の段落の最初の文", () => {
    expect(flatToParagraphPos(sampleParagraphs, 0)).toEqual({
      paragraphIndex: 0,
      sentenceOffset: 0,
    });
  });

  it("最初の段落の2番目の文", () => {
    expect(flatToParagraphPos(sampleParagraphs, 1)).toEqual({
      paragraphIndex: 0,
      sentenceOffset: 1,
    });
  });

  it("2番目の段落の先頭", () => {
    expect(flatToParagraphPos(sampleParagraphs, 2)).toEqual({
      paragraphIndex: 1,
      sentenceOffset: 0,
    });
  });

  it("2番目の段落の途中", () => {
    expect(flatToParagraphPos(sampleParagraphs, 4)).toEqual({
      paragraphIndex: 1,
      sentenceOffset: 2,
    });
  });

  it("最後の段落", () => {
    expect(flatToParagraphPos(sampleParagraphs, 5)).toEqual({
      paragraphIndex: 2,
      sentenceOffset: 0,
    });
  });

  it("空の段落配列はデフォルト値を返す", () => {
    expect(flatToParagraphPos([], 0)).toEqual({
      paragraphIndex: 0,
      sentenceOffset: 0,
    });
  });
});

describe("paragraphDistance", () => {
  it("同じ段落は距離0", () => {
    expect(paragraphDistance(1, 1)).toBe(0);
  });

  it("1つ離れた段落は距離1", () => {
    expect(paragraphDistance(1, 0)).toBe(1);
  });

  it("2つ離れた段落は距離2", () => {
    expect(paragraphDistance(2, 0)).toBe(2);
  });

  it("距離3以上は3にクランプ", () => {
    expect(paragraphDistance(4, 0)).toBe(3);
  });

  it("後方の段落も距離が計算される（双方向）", () => {
    expect(paragraphDistance(0, 2)).toBe(2);
  });
});
