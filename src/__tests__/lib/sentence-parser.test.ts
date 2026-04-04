import { describe, it, expect } from "vitest";
import { parseSentences } from "@/lib/sentence-parser";

describe("parseSentences", () => {
  it("句点で分割する", () => {
    expect(parseSentences("太郎は走った。花子は笑った。")).toEqual([
      "太郎は走った。",
      "花子は笑った。",
    ]);
  });

  it("改行で分割する（詩・俳句）", () => {
    expect(parseSentences("春の海\nひねもすのたり\nのたりかな")).toEqual([
      "春の海",
      "ひねもすのたり",
      "のたりかな",
    ]);
  });

  it("段落を分割する", () => {
    expect(parseSentences("段落一。\n\n段落二。")).toEqual([
      "段落一。",
      "段落二。",
    ]);
  });

  it("省略記号+句点を処理する", () => {
    expect(
      parseSentences("彼は黙った……。そして歩き出した。"),
    ).toEqual(["彼は黙った……。", "そして歩き出した。"]);
  });

  it("鉤括弧内の句点で分割する", () => {
    expect(parseSentences("「それは嘘だ。」彼は叫んだ。")).toEqual([
      "「それは嘘だ。",
      "」彼は叫んだ。",
    ]);
  });

  it("空行のみの入力は空配列を返す", () => {
    expect(parseSentences("\n\n\n")).toEqual([]);
  });

  it("CRLF を正規化する", () => {
    expect(parseSentences("一文目。\r\n\r\n二文目。")).toEqual([
      "一文目。",
      "二文目。",
    ]);
  });

  it("空文字列は空配列を返す", () => {
    expect(parseSentences("")).toEqual([]);
  });

  it("句点と改行が混在する段落は句点分割を優先する", () => {
    expect(
      parseSentences("朝が来た。\n鳥が鳴いた。"),
    ).toEqual(["朝が来た。", "鳥が鳴いた。"]);
  });

  it("単一文を処理する", () => {
    expect(parseSentences("今日は天気がいい。")).toEqual([
      "今日は天気がいい。",
    ]);
  });

  it("splits multi-line dialogue with periods by period (not newline)", () => {
    const input = "「行って参ります。\n　さようなら。」";
    const result = parseSentences(input);
    // Since the paragraph contains periods, period-splitting takes priority
    // Newlines are ignored within the paragraph
    expect(result).toEqual(["「行って参ります。", "さようなら。", "」"]);
  });
});
