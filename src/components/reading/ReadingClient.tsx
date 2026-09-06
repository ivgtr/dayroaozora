"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { TodayState, ReadingPhase, BookshelfEntry, Paragraph } from "@/types";
import { blocksToParagraphs } from "@/lib/sentence-parser";
import { loadTodayState, createInitialState, reconcileTodayState, saveTodayState } from "@/lib/reading-state";
import {
  addCompleted,
  addFavorite,
  isFavorite as checkIsFavorite,
  loadBookshelf,
  updateReadingPosition,
  reconcileBookshelfPosition,
} from "@/lib/bookshelf";
import { formatJstDate } from "@/lib/date-utils";
import { getWorkContent, cleanupExpiredCache, prefetchWork } from "@/lib/content-cache";
import { useStreak } from "@/hooks/useStreak";
import { useTheme } from "@/hooks/useTheme";
import ReadingView from "./ReadingView";
import ReadingHeader from "./ReadingHeader";
import ProgressFooter from "./ProgressFooter";
import ErrorScreen from "./ErrorScreen";
import LoadingScreen from "./LoadingScreen";
import InfoModal from "@/components/InfoModal";
import styles from "./ReadingClient.module.css";

const MIN_LOADING_MS = 800;

interface WorkData {
  title: string;
  author: string;
  charCount: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ReadingClient() {
  const searchParams = useSearchParams();
  const bookshelfWorkId = searchParams.get("source") === "bookshelf"
    ? Number(searchParams.get("workId"))
    : null;
  const isBookshelfReread = bookshelfWorkId !== null && !Number.isNaN(bookshelfWorkId) && bookshelfWorkId > 0;

  const [phase, setPhase] = useState<ReadingPhase>("loading");
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [todayState, setTodayState] = useState<TodayState | null>(null);
  const [workData, setWorkData] = useState<WorkData | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewPosition, setViewPosition] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookshelfEntryStatus, setBookshelfEntryStatus] = useState<BookshelfEntry["status"] | null>(null);
  const [completionData, setCompletionData] = useState<{ readingTime: number; tapCount: number } | null>(null);
  const [updateNotice, setUpdateNotice] = useState(false);
  const loadSequence = useRef(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const sentences = useMemo(
    () => paragraphs.flatMap((p) => p.sentences),
    [paragraphs],
  );
  const { streak, updateStreak } = useStreak();
  const { theme, toggleTheme } = useTheme();
  const prefetchRef = useRef<{ workId: number; date: string } | null>(null);
  const progressRef = useRef(0);
  const viewPositionRef = useRef(0);

  const loadDailyData = useCallback(async () => {
    const sequence = ++loadSequence.current;
    try {
      setPhase("loading");
      prefetchRef.current = null;
      setCompletionData(null);
      setUpdateNotice(false);

      const saved = loadTodayState();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [todayJson] = await Promise.all([
        fetch("/api/today", { signal: controller.signal }).then((res) => {
          if (!res.ok) throw new Error("Failed to fetch today's work");
          return res.json();
        }).finally(() => clearTimeout(timeoutId)),
        delay(MIN_LOADING_MS),
      ]);

      const workId: number = todayJson.today.workId;

      const work = await getWorkContent(workId);
      if (sequence !== loadSequence.current) return;



      const parsed = blocksToParagraphs(work.blocks);
      setParagraphs(parsed);
      setWorkData({
        title: work.title,
        author: work.author,
        charCount: work.charCount,
      });

      const resumed = saved && saved.workId === workId
        ? reconcileTodayState(saved, work.readingContentId)
        : { state: createInitialState(workId, work.readingContentId), reset: false };
      const state = resumed.state;
      setUpdateNotice(resumed.reset);
      if (resumed.reset) saveTodayState(state);
      setTodayState(state);
      setProgress(state.progress);
      setViewPosition(state.viewPosition);
      progressRef.current = state.progress;
      viewPositionRef.current = state.viewPosition;
      setIsResuming(state.progress > 0);
      setIsFavorite(checkIsFavorite(loadBookshelf(), workId));

      if (state.completed) {
        const bookshelfEntries = loadBookshelf();
        const entry = bookshelfEntries.find((e) => e.workId === workId);
        setCompletionData({
          readingTime: entry?.readingTime ?? 0,
          tapCount: entry?.tapCount ?? 0,
        });
      }

      prefetchRef.current = todayJson.prefetchEnabled === false ? null : {
        workId: todayJson.tomorrow.workId, date: todayJson.today.date,
      };
      setPhase("transitioning");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(() => setPhase("reading"));
      }
    } catch {
      if (sequence === loadSequence.current) setPhase("error");
    }
  }, []);

  const loadBookshelfData = useCallback(async () => {
    if (!bookshelfWorkId) return;
    const sequence = ++loadSequence.current;

    try {
      setPhase("loading");

      setCompletionData(null);
      setUpdateNotice(false);
      const [work] = await Promise.all([
        getWorkContent(bookshelfWorkId),
        delay(MIN_LOADING_MS),
      ]);
      if (sequence !== loadSequence.current) return;

      const parsed = blocksToParagraphs(work.blocks);
      setParagraphs(parsed);
      setWorkData({
        title: work.title,
        author: work.author,
        charCount: work.charCount,
      });

      const resumed = reconcileBookshelfPosition(bookshelfWorkId, work.readingContentId);
      const entry = resumed.entry;
      setUpdateNotice(resumed.reset);

      let initialProgress = 0;
      let initialViewPosition = 0;
      let resuming = false;

      if (entry && entry.status === "favorite" && entry.lastProgress !== null && entry.lastViewPosition !== null) {
        initialProgress = entry.lastProgress;
        initialViewPosition = entry.lastViewPosition;
        resuming = initialProgress > 0;
      }

      setBookshelfEntryStatus(entry?.status ?? null);

      const state: TodayState = {
        readingContentId: work.readingContentId,
        date: formatJstDate(new Date()),
        workId: bookshelfWorkId,
        progress: initialProgress,
        viewPosition: initialViewPosition,
        tapCount: 0,
        startedAt: new Date().toISOString(),
        completed: false,
      };

      setTodayState(state);
      setProgress(initialProgress);
      setViewPosition(initialViewPosition);
      progressRef.current = initialProgress;
      viewPositionRef.current = initialViewPosition;
      setIsResuming(resuming);

      setPhase("transitioning");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(() => setPhase("reading"));
      }
    } catch {
      if (sequence === loadSequence.current) setPhase("error");
    }
  }, [bookshelfWorkId]);

  useEffect(() => {
    cleanupExpiredCache().catch(() => {});
  }, []);

  useEffect(() => {
    if (isBookshelfReread) {
      loadBookshelfData(); // eslint-disable-line react-hooks/set-state-in-effect -- async data loader, setState is after await
    } else {
      loadDailyData();
    }
  }, [isBookshelfReread, loadBookshelfData, loadDailyData]);

  useEffect(() => {
    if (phase !== "reading" || isBookshelfReread || !prefetchRef.current) return;
    const { workId, date } = prefetchRef.current;
    prefetchWork(workId, date).catch(() => {});
  }, [phase, isBookshelfReread]);

  useEffect(() => {
    if (phase !== "reading" || !updateNotice) return;
    const timer = setTimeout(() => setUpdateNotice(false), 8000);
    return () => clearTimeout(timer);
  }, [phase, updateNotice]);

  // Save reading position for favorite entries on beforeunload
  useEffect(() => {
    if (!isBookshelfReread || bookshelfEntryStatus !== "favorite" || !bookshelfWorkId) return;

    const handleBeforeUnload = () => {
      updateReadingPosition(bookshelfWorkId, progressRef.current, viewPositionRef.current, todayState?.readingContentId);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isBookshelfReread, bookshelfEntryStatus, bookshelfWorkId, todayState?.readingContentId]);

  const handleTransitionEnd = useCallback(() => {
    setPhase((current) => (current === "transitioning" ? "reading" : current));
  }, []);

  const handleSkipTransition = useCallback(() => {
    setPhase((current) => (current === "transitioning" ? "reading" : current));
  }, []);

  const handleSkipKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleSkipTransition();
      }
    },
    [handleSkipTransition],
  );

  const remainingChars = useMemo(() => {
    if (sentences.length === 0) return 0;
    return sentences
      .slice(progress + 1)
      .reduce((sum, s) => sum + s.text.length, 0);
  }, [sentences, progress]);

  const handleProgressChange = useCallback((p: number) => {
    setProgress(p);
    progressRef.current = p;
  }, []);

  const handleViewPositionChange = useCallback((vp: number) => {
    setViewPosition(vp);
    viewPositionRef.current = vp;

    if (isBookshelfReread && bookshelfEntryStatus === "favorite" && bookshelfWorkId) {
      updateReadingPosition(bookshelfWorkId, progressRef.current, vp, todayState?.readingContentId);
    }
  }, [isBookshelfReread, bookshelfEntryStatus, bookshelfWorkId, todayState?.readingContentId]);

  const handleDateChange = useCallback(() => {
    if (isBookshelfReread) return;
    setPhase("loading");
    loadDailyData();
  }, [isBookshelfReread, loadDailyData]);

  const handleInfoOpen = useCallback(() => setInfoOpen(true), []);
  const handleInfoClose = useCallback(() => setInfoOpen(false), []);

  const handleFavoriteAdd = useCallback(() => {
    if (!todayState || isFavorite) return;
    const firstLine = sentences[0]?.text ?? "";
    addFavorite(todayState.workId, firstLine, progress, viewPosition, todayState.readingContentId);
    setIsFavorite(true);
  }, [todayState, isFavorite, sentences, progress, viewPosition]);

  const handleComplete = useCallback((finalTapCount: number) => {
    if (!todayState || !workData) return;

    const readingTime = Date.now() - new Date(todayState.startedAt).getTime();
    const firstLine = sentences[0]?.text ?? "";

    addCompleted(
      todayState.workId,
      workData.title,
      workData.author,
      firstLine,
      readingTime,
      finalTapCount,
      todayState.readingContentId,
    );

    setCompletionData({ readingTime, tapCount: finalTapCount });

    if (!isBookshelfReread) {
      updateStreak(formatJstDate(new Date()));
    }
  }, [todayState, workData, sentences, updateStreak, isBookshelfReread]);

  if (phase === "loading" || phase === "transitioning") {
    return (
      <>
        <LoadingScreen
          fadeOut={phase === "transitioning"}
          onTransitionEnd={handleTransitionEnd}
        />
        {phase === "transitioning" && (
          <div
            className={styles.skipOverlay}
            onClick={handleSkipTransition}
            onKeyDown={handleSkipKeyDown}
            role="button"
            tabIndex={0}
            aria-label="スキップ"
          />
        )}
      </>
    );
  }

  if (phase === "error") {
    return (
      <ErrorScreen onRetry={isBookshelfReread ? loadBookshelfData : loadDailyData} />
    );
  }

  if (phase === "reading" && todayState && workData) {
    return (
      <>
        <ReadingHeader
          mode={isBookshelfReread ? "bookshelf" : "daily"}
          isFavorite={isFavorite}
          onFavoriteAdd={handleFavoriteAdd}
          theme={theme}
          onThemeToggle={toggleTheme}
          onInfoOpen={handleInfoOpen}
        />
        <InfoModal open={infoOpen} onClose={handleInfoClose} />
        {updateNotice && <p role="status" className={styles.updateNotice}>本文に合わせて、先頭から再開します。</p>}
        <ReadingView
          key={`${todayState.workId}:${todayState.readingContentId ?? "legacy"}`}
          paragraphs={paragraphs}
          initialState={todayState}
          onProgressChange={handleProgressChange}
          onViewPositionChange={handleViewPositionChange}
          isResuming={isResuming}
          onDateChange={handleDateChange}
          onComplete={handleComplete}
          skipPersist={isBookshelfReread}
          completionInfo={
            completionData
              ? {
                  title: workData.title,
                  author: workData.author,
                  readingTime: completionData.readingTime,
                  tapCount: completionData.tapCount,
                  streak: isBookshelfReread ? null : streak,
                  isBookshelfReread,
                }
              : null
          }
        />
        {!completionData && (
          <ProgressFooter
            progress={progress}
            totalSentences={sentences.length}
            remainingChars={remainingChars}
            viewPosition={viewPosition}
          />
        )}
      </>
    );
  }

  return null;
}
