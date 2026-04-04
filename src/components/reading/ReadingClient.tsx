"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { TodayState, ReadingPhase, WorkResponse, BookshelfEntry } from "@/types";
import { parseSentences } from "@/lib/sentence-parser";
import { loadTodayState, createInitialState } from "@/lib/reading-state";
import {
  addCompleted,
  addFavorite,
  isFavorite as checkIsFavorite,
  loadBookshelf,
  updateReadingPosition,
} from "@/lib/bookshelf";
import { formatJstDate } from "@/lib/date-utils";
import { useStreak } from "@/hooks/useStreak";
import ReadingView from "./ReadingView";
import ReadingHeader from "./ReadingHeader";
import ProgressFooter from "./ProgressFooter";
import CompletionScreen from "./CompletionScreen";
import LoadingScreen from "./LoadingScreen";
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
  const [sentences, setSentences] = useState<string[]>([]);
  const [todayState, setTodayState] = useState<TodayState | null>(null);
  const [workData, setWorkData] = useState<WorkData | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewPosition, setViewPosition] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookshelfEntryStatus, setBookshelfEntryStatus] = useState<BookshelfEntry["status"] | null>(null);
  const [completionData, setCompletionData] = useState<{ readingTime: number; tapCount: number } | null>(null);
  const { streak, updateStreak } = useStreak();
  const progressRef = useRef(0);
  const viewPositionRef = useRef(0);

  const loadDailyData = useCallback(async () => {
    try {
      setPhase("loading");

      const saved = loadTodayState();

      const [todayJson] = await Promise.all([
        fetch("/api/today").then((res) => {
          if (!res.ok) throw new Error("Failed to fetch today's work");
          return res.json();
        }),
        delay(MIN_LOADING_MS),
      ]);

      const workId: number = todayJson.today.workId;

      const workRes = await fetch(`/api/works/${workId}`);
      if (!workRes.ok) throw new Error("Failed to fetch work content");
      const work: WorkResponse = await workRes.json();

      const parsed = parseSentences(work.content);
      setSentences(parsed);
      setWorkData({
        title: work.title,
        author: work.author,
        charCount: work.charCount,
      });

      const state =
        saved && saved.workId === workId ? saved : createInitialState(workId);
      setTodayState(state);
      setProgress(state.progress);
      setViewPosition(state.viewPosition);
      progressRef.current = state.progress;
      viewPositionRef.current = state.viewPosition;
      setIsResuming(saved !== null && saved.workId === workId && saved.progress > 0);
      setIsFavorite(checkIsFavorite(loadBookshelf(), workId));

      if (state.completed) {
        const bookshelfEntries = loadBookshelf();
        const entry = bookshelfEntries.find((e) => e.workId === workId);
        setCompletionData({
          readingTime: entry?.readingTime ?? 0,
          tapCount: entry?.tapCount ?? 0,
        });
        setPhase("completed");
        return;
      }

      setPhase("transitioning");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(() => setPhase("reading"));
      }
    } catch {
      setPhase("error");
    }
  }, []);

  const loadBookshelfData = useCallback(async () => {
    if (!bookshelfWorkId) return;

    try {
      setPhase("loading");

      const [workRes] = await Promise.all([
        fetch(`/api/works/${bookshelfWorkId}`),
        delay(MIN_LOADING_MS),
      ]);
      if (!workRes.ok) throw new Error("Failed to fetch work content");
      const work: WorkResponse = await workRes.json();

      const parsed = parseSentences(work.content);
      setSentences(parsed);
      setWorkData({
        title: work.title,
        author: work.author,
        charCount: work.charCount,
      });

      const entries = loadBookshelf();
      const entry = entries.find((e) => e.workId === bookshelfWorkId);

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
      setPhase("error");
    }
  }, [bookshelfWorkId]);

  useEffect(() => {
    if (isBookshelfReread) {
      loadBookshelfData();
    } else {
      loadDailyData();
    }
  }, [isBookshelfReread, loadBookshelfData, loadDailyData]);

  // Save reading position for favorite entries on beforeunload
  useEffect(() => {
    if (!isBookshelfReread || bookshelfEntryStatus !== "favorite" || !bookshelfWorkId) return;

    const handleBeforeUnload = () => {
      updateReadingPosition(bookshelfWorkId, progressRef.current, viewPositionRef.current);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isBookshelfReread, bookshelfEntryStatus, bookshelfWorkId]);

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
      .reduce((sum, s) => sum + s.length, 0);
  }, [sentences, progress]);

  const handleProgressChange = useCallback((p: number) => {
    setProgress(p);
    progressRef.current = p;
  }, []);

  const handleViewPositionChange = useCallback((vp: number) => {
    setViewPosition(vp);
    viewPositionRef.current = vp;

    if (isBookshelfReread && bookshelfEntryStatus === "favorite" && bookshelfWorkId) {
      updateReadingPosition(bookshelfWorkId, progressRef.current, vp);
    }
  }, [isBookshelfReread, bookshelfEntryStatus, bookshelfWorkId]);

  const handleDateChange = useCallback(() => {
    if (isBookshelfReread) return;
    setPhase("loading");
    loadDailyData();
  }, [isBookshelfReread, loadDailyData]);

  const handleFavoriteAdd = useCallback(() => {
    if (!todayState || isFavorite) return;
    const firstLine = sentences[0] ?? "";
    addFavorite(todayState.workId, firstLine, progress, viewPosition);
    setIsFavorite(true);
  }, [todayState, isFavorite, sentences, progress, viewPosition]);

  const handleComplete = useCallback((finalTapCount: number) => {
    if (!todayState || !workData) return;

    const readingTime = Date.now() - new Date(todayState.startedAt).getTime();
    const firstLine = sentences[0] ?? "";

    addCompleted(
      todayState.workId,
      workData.title,
      workData.author,
      firstLine,
      readingTime,
      finalTapCount,
    );

    setCompletionData({ readingTime, tapCount: finalTapCount });

    if (!isBookshelfReread) {
      updateStreak(formatJstDate(new Date()));
    }

    setPhase("completed");
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
      <div className={styles.error}>
        <p>読み込みに失敗しました</p>
        <button
          className={styles.retryButton}
          onClick={isBookshelfReread ? loadBookshelfData : loadDailyData}
        >
          再試行
        </button>
      </div>
    );
  }

  if (phase === "completed" && workData && completionData) {
    return (
      <CompletionScreen
        title={workData.title}
        author={workData.author}
        readingTime={completionData.readingTime}
        tapCount={completionData.tapCount}
        streak={isBookshelfReread ? null : streak}
        isBookshelfReread={isBookshelfReread}
      />
    );
  }

  if (phase === "reading" && todayState && workData) {
    return (
      <>
        <ReadingHeader
          mode={isBookshelfReread ? "bookshelf" : "daily"}
          isFavorite={isFavorite}
          onFavoriteAdd={handleFavoriteAdd}
        />
        <ReadingView
          sentences={sentences}
          initialState={todayState}
          onProgressChange={handleProgressChange}
          onViewPositionChange={handleViewPositionChange}
          isResuming={isResuming}
          onDateChange={handleDateChange}
          onComplete={handleComplete}
          skipPersist={isBookshelfReread}
        />
        <ProgressFooter
          progress={progress}
          totalSentences={sentences.length}
          remainingChars={remainingChars}
          viewPosition={viewPosition}
        />
      </>
    );
  }

  return null;
}
