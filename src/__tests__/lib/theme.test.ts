// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadTheme, saveTheme, getEffectiveTheme, toggleTheme } from "@/lib/theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  describe("loadTheme", () => {
    it("returns 'system' when no value is stored", () => {
      expect(loadTheme()).toBe("system");
    });

    it("returns stored 'light' value", () => {
      localStorage.setItem("dayro:theme", "light");
      expect(loadTheme()).toBe("light");
    });

    it("returns stored 'dark' value", () => {
      localStorage.setItem("dayro:theme", "dark");
      expect(loadTheme()).toBe("dark");
    });

    it("returns stored 'system' value", () => {
      localStorage.setItem("dayro:theme", "system");
      expect(loadTheme()).toBe("system");
    });

    it("returns 'system' for invalid values", () => {
      localStorage.setItem("dayro:theme", "invalid");
      expect(loadTheme()).toBe("system");
    });
  });

  describe("saveTheme", () => {
    it("persists 'light' to localStorage", () => {
      saveTheme("light");
      expect(localStorage.getItem("dayro:theme")).toBe("light");
    });

    it("persists 'dark' to localStorage", () => {
      saveTheme("dark");
      expect(localStorage.getItem("dayro:theme")).toBe("dark");
    });

    it("persists 'system' to localStorage", () => {
      saveTheme("system");
      expect(localStorage.getItem("dayro:theme")).toBe("system");
    });
  });

  describe("getEffectiveTheme", () => {
    it("returns 'light' for light preference", () => {
      expect(getEffectiveTheme("light")).toBe("light");
    });

    it("returns 'dark' for dark preference", () => {
      expect(getEffectiveTheme("dark")).toBe("dark");
    });

    it("returns 'light' for system preference when OS is light", () => {
      vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
      expect(getEffectiveTheme("system")).toBe("light");
      vi.unstubAllGlobals();
    });

    it("returns 'dark' for system preference when OS is dark", () => {
      vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
      expect(getEffectiveTheme("system")).toBe("dark");
      vi.unstubAllGlobals();
    });
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark", () => {
      localStorage.setItem("dayro:theme", "light");
      const result = toggleTheme();
      expect(result).toBe("dark");
      expect(localStorage.getItem("dayro:theme")).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("toggles from dark to light", () => {
      localStorage.setItem("dayro:theme", "dark");
      const result = toggleTheme();
      expect(result).toBe("light");
      expect(localStorage.getItem("dayro:theme")).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("toggles from system (OS light) to dark", () => {
      vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
      const result = toggleTheme();
      expect(result).toBe("dark");
      expect(localStorage.getItem("dayro:theme")).toBe("dark");
      vi.unstubAllGlobals();
    });

    it("toggles from system (OS dark) to light", () => {
      vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
      const result = toggleTheme();
      expect(result).toBe("light");
      expect(localStorage.getItem("dayro:theme")).toBe("light");
      vi.unstubAllGlobals();
    });
  });
});
