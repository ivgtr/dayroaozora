"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TodayState, ReadingPhase, WorkResponse } from "@/types";
import { parseSentences } from "@/lib/sentence-parser";
import { loadTodayState, createInitialState } from "@/lib/reading-state";
import ReadingView from "./ReadingView";
import ReadingHeader from "./ReadingHeader";
import ProgressFooter from "./ProgressFooter";
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
  const [phase, setPhase] = useState<ReadingPhase>("loading");
  const [sentences, setSentences] = useState<string[]>([]);
  const [todayState, setTodayState] = useState<TodayState | null>(null);
  const [workData, setWorkData] = useState<WorkData | null>(null);
  const [progress, setProgress] = useState(0);
  const [isResuming, setIsResuming] = useState(false);

  const loadData = useCallback(async () => {
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
      setIsResuming(saved !== null && saved.workId === workId && saved.progress > 0);
      setPhase("transitioning");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        requestAnimationFrame(() => setPhase("reading"));
      }
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  }, []);

  const handleDateChange = useCallback(() => {
    setPhase("loading");
    loadData();
  }, [loadData]);

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
        <button className={styles.retryButton} onClick={loadData}>
          再試行
        </button>
      </div>
    );
  }

  if (phase === "reading" && todayState && workData) {
    return (
      <>
        <ReadingHeader />
        <ReadingView
          sentences={sentences}
          initialState={todayState}
          onProgressChange={handleProgressChange}
          isResuming={isResuming}
          onDateChange={handleDateChange}
        />
        <ProgressFooter
          progress={progress}
          totalSentences={sentences.length}
          remainingChars={remainingChars}
        />
      </>
    );
  }

  return null;
}
