import type { Theme } from "@/types";

const STORAGE_KEY = "dayro:theme";

export function loadTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // localStorage unavailable (SSR, etc.)
  }
  return "system";
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable
  }
}

export function getEffectiveTheme(preference: Theme): "light" | "dark" {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function toggleTheme(): "light" | "dark" {
  const current = getEffectiveTheme(loadTheme());
  const next = current === "light" ? "dark" : "light";
  saveTheme(next);
  document.documentElement.dataset.theme = next;
  return next;
}
