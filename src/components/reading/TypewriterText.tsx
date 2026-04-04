"use client";

import { useEffect, useRef, memo } from "react";
import type { InlineNode } from "@/types";
import type { TypewriterController } from "@/hooks/useTypewriter";
import styles from "./TypewriterText.module.css";

interface TypewriterTextProps {
  nodes: InlineNode[];
  controller: TypewriterController;
}

function renderCharNodes(nodes: InlineNode[]): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.type === "ruby") {
      elements.push(
        <span key={`r${i}`} className={styles.twChar}>
          <ruby>
            {node.base}
            <rp>(</rp>
            <rt>{node.reading}</rt>
            <rp>)</rp>
          </ruby>
        </span>,
      );
    } else {
      const chars = [...node.text];
      const charSpans = chars.map((char, j) => (
        <span key={`${i}-${j}`} className={styles.twChar}>
          {char}
        </span>
      ));

      if (node.type === "emphasis") {
        elements.push(
          <em key={`e${i}`} className={styles.emphasis}>
            {charSpans}
          </em>,
        );
      } else if (node.type === "bold") {
        elements.push(<strong key={`b${i}`}>{charSpans}</strong>);
      } else {
        elements.push(...charSpans);
      }
    }
  }

  return elements;
}

function TypewriterTextInner({ nodes, controller }: TypewriterTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  const { charInterval, skipRef, isAnimatingRef, onEnd, reducedMotion } =
    controller;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const charEls = container.querySelectorAll<HTMLElement>(
      `.${styles.twChar}`,
    );
    const total = charEls.length;
    const cursorEl = container.querySelector<HTMLElement>(`.${styles.cursor}`);

    // Reset: hide all characters, show cursor
    for (let i = 0; i < total; i++) {
      charEls[i].classList.remove(styles.twVisible);
    }
    skipRef.current = false;
    isAnimatingRef.current = true;
    if (cursorEl) cursorEl.style.display = "";

    if (total === 0 || reducedMotion) {
      for (let i = 0; i < total; i++) {
        charEls[i].classList.add(styles.twVisible);
      }
      if (cursorEl) cursorEl.style.display = "none";
      isAnimatingRef.current = false;
      onEnd();
      return;
    }

    let startTime: number | null = null;
    let revealed = 0;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;

      if (skipRef.current) {
        for (let i = revealed; i < total; i++) {
          charEls[i].classList.add(styles.twVisible);
        }
        if (cursorEl) cursorEl.style.display = "none";
        rafRef.current = null;
        onEnd();
        return;
      }

      const elapsed = timestamp - startTime;
      const target = Math.min(Math.floor(elapsed / charInterval), total);

      while (revealed < target) {
        charEls[revealed].classList.add(styles.twVisible);
        revealed++;
      }

      if (revealed >= total) {
        if (cursorEl) cursorEl.style.display = "none";
        rafRef.current = null;
        onEnd();
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [nodes, charInterval, skipRef, isAnimatingRef, onEnd, reducedMotion]);

  return (
    <span ref={containerRef} className={styles.text}>
      {renderCharNodes(nodes)}
      <span className={styles.cursor} />
    </span>
  );
}

export default memo(TypewriterTextInner);
