/**
 * 青空文庫の本文テキストを文単位に分割する。
 *
 * アルゴリズム:
 * 1. 改行コードを LF に正規化
 * 2. 連続空行で段落に分割
 * 3. 段落ごとに「。」があれば句点分割、なければ改行分割
 * 4. 各文をトリムし、空文字列を除去
 */
export function parseSentences(content: string): string[] {
  // 1. Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n");

  // 2. Split by paragraphs (consecutive empty lines)
  const paragraphs = normalized.split(/\n{2,}/);

  const sentences: string[] = [];

  for (const paragraph of paragraphs) {
    // 3a. Period splitting takes priority
    if (paragraph.includes("。")) {
      const parts = paragraph.split("。");
      for (let i = 0; i < parts.length; i++) {
        // Re-attach 。 to all parts except the last (which follows the final 。)
        const text = i < parts.length - 1 ? parts[i] + "。" : parts[i];
        const trimmed = text.trim();
        if (trimmed) {
          sentences.push(trimmed);
        }
      }
    } else {
      // 3b. Newline splitting (poetry / haiku)
      const lines = paragraph.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          sentences.push(trimmed);
        }
      }
    }
  }

  return sentences;
}
