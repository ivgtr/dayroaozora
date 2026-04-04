"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import type { TodayState, Paragraph as ParagraphData, StreakData } from "@/types";
import { useReadingState } from "@/hooks/useReadingState";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useScrollSnap } from "@/hooks/useScrollSnap";
import { flatToParagraphPos, paragraphDistance } from "@/lib/paragraph-index";
import Paragraph from "./Paragraph";
import CompletionSection from "./CompletionSection";
import styles from "./ReadingView.module.css";

interface CompletionInfo {
  title: string;
  author: string;
  readingTime: number;
  tapCount: number;
  streak: StreakData | null;
  isBookshelfReread: boolean;
}

interface ReadingViewProps {
  paragraphs: ParagraphData[];
  initialState: TodayState;
  onProgressChange?: (progress: number) => void;
  onViewPositionChange?: (viewPosition: number) => void;
  isResuming?: boolean;
  onDateChange?: () => void;
  onComplete?: (tapCount: number) => void;
  skipPersist?: boolean;
  completionInfo?: CompletionInfo | null;
}

export default function ReadingView({
  paragraphs,
  initialState,
  onProgressChange,
  onViewPositionChange,
  isResuming = false,
  onDateChange,
  onComplete,
  skipPersist = false,
  completionInfo = null,
}: ReadingViewProps) {
  const paragraphElsRef = useRef<Map<number, HTMLElement>>(new Map());
  const scrollToParagraphRef = useRef<(index: number) => void>(() => {});
  const resumeHandledRef = useRef(false);
  const paragraphsRef = useRef(paragraphs);
  const completionScrolledRef = useRef(false);

  useEffect(() => {
    paragraphsRef.current = paragraphs;
  }, [paragraphs]);

  const sentences = useMemo(
    () => paragraphs.flatMap((p) => p.sentences),
    [paragraphs],
  );

  const handleViewPositionChange = useCallback((_flatIndex: number) => {
    // スクロールは useEffect で描画後に実行するため、ここでは何もしない
  }, []);

  const {
    progress,
    viewPosition,
    isNewSentence,
    handleTap,
    setViewPosition,
  } = useReadingState({
    initialState,
    totalSentences: sentences.length,
    onViewPositionChange: handleViewPositionChange,
    onDateChange,
    onComplete,
    skipPersist,
  });

  const currentSentenceText = sentences[progress]?.text ?? "";

  const { displayedChars, isAnimating, skip } = useTypewriter({
    text: currentSentenceText,
    isActive: isNewSentence,
  });

  const announcedText = useMemo(
    () => sentences[isNewSentence ? progress : viewPosition]?.text ?? "",
    [isNewSentence, sentences, progress, viewPosition],
  );

  const progressParaPos = useMemo(
    () => flatToParagraphPos(paragraphs, progress),
    [paragraphs, progress],
  );

  const visibleParagraphCount = useMemo(
    () => paragraphs.filter((p) => p.startIndex <= progress).length,
    [paragraphs, progress],
  );

  const totalVisible = completionInfo
    ? visibleParagraphCount + 1
    : visibleParagraphCount;

  const completionIndex = visibleParagraphCount;

  const handleSnap = useCallback(
    (paraIndex: number) => {
      const para = paragraphsRef.current[paraIndex];
      if (!para) return;
      const lastInPara = para.startIndex + para.sentences.length - 1;
      setViewPosition(lastInPara);
    },
    [setViewPosition],
  );

  const { scrollToSentence: scrollToParagraph } = useScrollSnap({
    sentenceRefs: paragraphElsRef,
    totalVisible,
    onSnap: handleSnap,
    onUserScroll: skip,
    enabled: true,
  });

  useEffect(() => {
    scrollToParagraphRef.current = scrollToParagraph;
  }, [scrollToParagraph]);

  // 描画後にスクロール（DOM が更新された後の正確な位置を使う）
  useEffect(() => {
    const { paragraphIndex } = flatToParagraphPos(
      paragraphsRef.current,
      viewPosition,
    );
    scrollToParagraphRef.current(paragraphIndex);
  }, [viewPosition]);

  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  useEffect(() => {
    onViewPositionChange?.(viewPosition);
  }, [viewPosition, onViewPositionChange]);

  useEffect(() => {
    if (isResuming && !resumeHandledRef.current) {
      resumeHandledRef.current = true;
      const { paragraphIndex } = flatToParagraphPos(
        paragraphs,
        initialState.viewPosition,
      );
      scrollToParagraph(paragraphIndex);
    }
  }, [isResuming, scrollToParagraph, paragraphs, initialState.viewPosition]);

  useEffect(() => {
    if (!completionInfo) {
      completionScrolledRef.current = false;
      return;
    }
    if (!completionScrolledRef.current && paragraphElsRef.current.has(completionIndex)) {
      completionScrolledRef.current = true;
      scrollToParagraphRef.current(completionIndex);
    }
  }, [completionInfo, completionIndex]);

  const setParagraphRef = useCallback(
    (paraIndex: number) => (el: HTMLElement | null) => {
      if (el) {
        paragraphElsRef.current.set(paraIndex, el);
      } else {
        paragraphElsRef.current.delete(paraIndex);
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleTap();
      }
    },
    [handleTap],
  );

  const showTypewriter = isNewSentence;

  return (
    <div
      className={styles.container}
      tabIndex={0}
      role="application"
      onClick={handleTap}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.srOnly} aria-live="polite">
        {announcedText}
      </div>
      {paragraphs.slice(0, visibleParagraphCount).map((para, pIdx) => {
        const visibleCount = Math.min(
          progress - para.startIndex + 1,
          para.sentences.length,
        );
        const isActivePara = pIdx === progressParaPos.paragraphIndex;
        const dist = paragraphDistance(paragraphs, pIdx, viewPosition);

        return (
          <Paragraph
            key={para.startIndex}
            ref={setParagraphRef(pIdx)}
            sentences={para.sentences}
            paragraphIndex={pIdx}
            visibleCount={visibleCount}
            distance={dist}
            typewriterContent={
              isActivePara && showTypewriter
                ? { displayedChars, isAnimating }
                : undefined
            }
          />
        );
      })}
      {!completionInfo && <div className={styles.readingSpacer} />}
      {completionInfo && (
        <CompletionSection
          ref={setParagraphRef(completionIndex)}
          paragraphIndex={completionIndex}
          title={completionInfo.title}
          author={completionInfo.author}
          readingTime={completionInfo.readingTime}
          tapCount={completionInfo.tapCount}
          streak={completionInfo.streak}
          isBookshelfReread={completionInfo.isBookshelfReread}
        />
      )}
    </div>
  );
}
