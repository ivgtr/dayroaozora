// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildShareText } from "@/lib/share";

describe("share", () => {
  describe("buildShareText", () => {
    const baseParams = {
      title: "走れメロス",
      author: "太宰治",
      readingTime: 180000,
      tapCount: 42,
      streak: 0,
      isBookshelfReread: false,
      siteUrl: "https://example.com",
    };

    it("generates daily completion text without streak", () => {
      const text = buildShareText(baseParams);
      expect(text).toBe(
        "📖 今日の一冊『走れメロス』太宰治 を読みました\n⏱ 3分 | 👆 42タップ\n#DayroAozora https://example.com",
      );
    });

    it("generates daily completion text with streak >= 2", () => {
      const text = buildShareText({ ...baseParams, streak: 5 });
      expect(text).toBe(
        "📖 今日の一冊『走れメロス』太宰治 を読みました\n⏱ 3分 | 👆 42タップ | 🔥 5日連続\n#DayroAozora https://example.com",
      );
    });

    it("does not include streak when streak is 1", () => {
      const text = buildShareText({ ...baseParams, streak: 1 });
      expect(text).not.toContain("🔥");
    });

    it("generates bookshelf reread text", () => {
      const text = buildShareText({ ...baseParams, isBookshelfReread: true });
      expect(text).toBe(
        "📖『走れメロス』太宰治 を読み返しました\n#DayroAozora https://example.com",
      );
    });

    it("calculates minutes with Math.max(1, Math.round(...))", () => {
      const text = buildShareText({ ...baseParams, readingTime: 20000 });
      expect(text).toContain("⏱ 1分");
    });

    it("rounds reading time correctly", () => {
      const text = buildShareText({ ...baseParams, readingTime: 150000 });
      expect(text).toContain("⏱ 3分");
    });
  });
});
