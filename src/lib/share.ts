import type { ShareTextParams } from "@/types";

export function buildShareText(params: ShareTextParams): string {
  const { title, author, readingTime, tapCount, streak, isBookshelfReread, siteUrl } = params;

  if (isBookshelfReread) {
    return `📖『${title}』${author} を読み返しました\n#DayroAozora ${siteUrl}`;
  }

  const minutes = Math.max(1, Math.round(readingTime / 60000));
  const statsLine = streak >= 2
    ? `⏱ ${minutes}分 | 👆 ${tapCount}タップ | 🔥 ${streak}日連続`
    : `⏱ ${minutes}分 | 👆 ${tapCount}タップ`;

  return `📖 今日の一冊『${title}』${author} を読みました\n${statsLine}\n#DayroAozora ${siteUrl}`;
}

export async function shareViaWebShareAPI(text: string, url: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }
  try {
    await navigator.share({ text, url });
    return true;
  } catch {
    return false;
  }
}

export function shareToX(text: string): void {
  window.open(
    `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function shareToBluesky(text: string): void {
  window.open(
    `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}
