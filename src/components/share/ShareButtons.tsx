"use client";

import { useCallback, useMemo } from "react";
import { buildShareText, shareViaWebShareAPI, shareToX, shareToBluesky } from "@/lib/share";
import styles from "./ShareButtons.module.css";

interface ShareButtonsProps {
  title: string;
  author: string;
  readingTime: number;
  tapCount: number;
  streak: number;
  isBookshelfReread: boolean;
}

export default function ShareButtons({
  title,
  author,
  readingTime,
  tapCount,
  streak,
  isBookshelfReread,
}: ShareButtonsProps) {
  const siteUrl = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin)
    : "";

  const shareText = useMemo(
    () => buildShareText({ title, author, readingTime, tapCount, streak, isBookshelfReread, siteUrl }),
    [title, author, readingTime, tapCount, streak, isBookshelfReread, siteUrl],
  );

  const hasWebShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleWebShare = useCallback(() => {
    void shareViaWebShareAPI(shareText, siteUrl);
  }, [shareText, siteUrl]);

  const handleShareToX = useCallback(() => {
    shareToX(shareText);
  }, [shareText]);

  const handleShareToBluesky = useCallback(() => {
    shareToBluesky(shareText);
  }, [shareText]);

  return (
    <div className={styles.container}>
      {hasWebShare && (
        <button className={styles.button} type="button" onClick={handleWebShare}>
          共有
        </button>
      )}
      <button className={styles.button} type="button" onClick={handleShareToX} aria-label="Xで共有">
        𝕏
      </button>
      <button className={styles.button} type="button" onClick={handleShareToBluesky} aria-label="Blueskyで共有">
        🦋
      </button>
    </div>
  );
}
