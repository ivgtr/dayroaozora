// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadingClient from "@/components/reading/ReadingClient";
import { getWorkContent, prefetchWork } from "@/lib/content-cache";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/content-cache", () => ({ getWorkContent: vi.fn(), prefetchWork: vi.fn().mockResolvedValue(undefined), cleanupExpiredCache: vi.fn().mockResolvedValue(0) }));
vi.mock("@/hooks/useStreak", () => ({ useStreak: () => ({ streak: 0, updateStreak: vi.fn() }) }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));
vi.mock("@/components/reading/LoadingScreen", () => ({ default: ({ fadeOut, onTransitionEnd }: { fadeOut: boolean; onTransitionEnd: () => void }) => <button disabled={!fadeOut} onClick={onTransitionEnd}>open</button> }));
vi.mock("@/components/reading/ReadingView", () => ({ default: () => <div>reading</div> }));
vi.mock("@/components/reading/ReadingHeader", () => ({ default: () => null }));
vi.mock("@/components/reading/ProgressFooter", () => ({ default: () => null }));
vi.mock("@/components/InfoModal", () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.mocked(getWorkContent).mockResolvedValue({ workId: 100, title: "title", author: "author", charCount: 2, blocks: [{ type: "paragraph", text: "本文", nodes: [{ type: "text", text: "本文" }] }] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([undefined, false])("prefetches only after reading is rendered (enabled=%s)", async enabled => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ today: { workId: 100, date: "2026-09-06" }, tomorrow: { workId: 200 }, prefetchEnabled: enabled })));
  render(<ReadingClient />);
  await waitFor(() => expect((screen.getByText("open") as HTMLButtonElement).disabled).toBe(false), { timeout: 2000 });
  expect(prefetchWork).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("open"));
  await screen.findByText("reading");
  if (enabled === false) expect(prefetchWork).not.toHaveBeenCalled();
  else expect(prefetchWork).toHaveBeenCalledExactlyOnceWith(200, "2026-09-06");
});
it("does not prefetch if today's content fails", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ today: { workId: 100 }, tomorrow: { workId: 200 } })));
  vi.mocked(getWorkContent).mockRejectedValue(new Error("unavailable"));
  render(<ReadingClient />);
  await waitFor(() => expect(getWorkContent).toHaveBeenCalled(), { timeout: 2000 });
  expect(prefetchWork).not.toHaveBeenCalled();
});
