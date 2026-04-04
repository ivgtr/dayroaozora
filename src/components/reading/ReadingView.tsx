"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import type { TodayState } from "@/types";
import { useReadingState } from "@/hooks/useReadingState";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useScrollSnap } from "@/hooks/useScrollSnap";
import Sentence from "./Sentence";
import TypewriterText from "./TypewriterText";
import styles from "./ReadingView.module.css";

interface ReadingViewProps {
  sentences: string[];
  initialState: TodayState;
  onProgressChange?: (progress: number) => void;
  isResuming?: boolean;
  onDateChange?: () => void;
}

export default function ReadingView({
  sentences,
  initialState,
  onProgressChange,
  isResuming = false,
  onDateChange,
}: ReadingViewProps) {
  const sentenceElsRef = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const scrollToSentenceRef = useRef<(index: number) => void>(() => {});
  const resumeHandledRef = useRef(false);

  const handleViewPositionChange = useCallback((index: number) => {
    scrollToSentenceRef.current(index);
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
  });

  const { displayedText, isAnimating, skip } = useTypewriter({
    text: sentences[progress] ?? "",
    isActive: isNewSentence,
  });

  const announcedText = useMemo(() => {
    if (isNewSentence && isAnimating) {
      return "";
    }
    if (isNewSentence) {
      return sentences[progress] ?? "";
    }
    return sentences[viewPosition] ?? "";
  }, [isNewSentence, isAnimating, sentences, progress, viewPosition]);

  const { scrollToSentence } = useScrollSnap({
    sentenceRefs: sentenceElsRef,
    totalVisible: progress + 1,
    onSnap: setViewPosition,
    onUserScroll: skip,
    enabled: true,
  });

  useEffect(() => {
    scrollToSentenceRef.current = scrollToSentence;
  }, [scrollToSentence]);

  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  useEffect(() => {
    if (isResuming && !resumeHandledRef.current) {
      resumeHandledRef.current = true;
      scrollToSentence(initialState.viewPosition);
    }
  }, [isResuming, scrollToSentence, initialState.viewPosition]);

  const setSentenceRef = useCallback(
    (index: number) => (el: HTMLParagraphElement | null) => {
      if (el) {
        sentenceElsRef.current.set(index, el);
      } else {
        sentenceElsRef.current.delete(index);
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
      {sentences.slice(0, progress + 1).map((text, index) => {
        const showTypewriter =
          index === progress && isNewSentence && isAnimating;
        return (
          <Sentence
            key={index}
            ref={setSentenceRef(index)}
            text={text}
            index={index}
            viewPosition={viewPosition}
            progress={progress}
          >
            {showTypewriter ? (
              <TypewriterText
                displayedText={displayedText}
                isAnimating={isAnimating}
              />
            ) : undefined}
          </Sentence>
        );
      })}
    </div>
  );
}
