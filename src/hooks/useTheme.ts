"use client";

import { useState, useEffect, useCallback } from "react";
import { loadTheme, getEffectiveTheme, toggleTheme as toggle } from "@/lib/theme";

export function useTheme(): { theme: "light" | "dark"; toggleTheme: () => void } {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return getEffectiveTheme(loadTheme());
  });

  useEffect(() => {
    const preference = loadTheme();
    if (preference !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (loadTheme() !== "system") return;
      const effective = e.matches ? "dark" : "light";
      document.documentElement.dataset.theme = effective;
      setTheme(effective);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleToggle = useCallback(() => {
    const next = toggle();
    setTheme(next);
  }, []);

  return { theme, toggleTheme: handleToggle };
}
