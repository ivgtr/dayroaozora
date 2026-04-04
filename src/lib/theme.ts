import type { Theme } from "@/types";

export const STORAGE_KEY = "dayro:theme";
const THEME_ATTRIBUTE = "data-theme";

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
  document.documentElement.setAttribute(THEME_ATTRIBUTE, next);
  return next;
}

export function generateThemeScript(): string {
  return `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=(t==="light"||t==="dark")?t:matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";document.documentElement.setAttribute("${THEME_ATTRIBUTE}",d)}catch(e){}})()`;
}
