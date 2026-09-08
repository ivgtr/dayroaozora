// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadingClient from "@/components/reading/ReadingClient";
import { getWorkContent, prefetchWork } from "@/lib/content-cache";

const navigation = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.search) }));
vi.mock("@/lib/content-cache", () => ({ getWorkContent: vi.fn(), prefetchWork: vi.fn().mockResolvedValue(undefined), cleanupExpiredCache: vi.fn().mockResolvedValue(0) }));
vi.mock("@/hooks/useStreak", () => ({ useStreak: () => ({ streak: 0, updateStreak: vi.fn() }) }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));
vi.mock("@/components/reading/LoadingScreen", () => ({ default: ({ fadeOut, onTransitionEnd }: { fadeOut: boolean; onTransitionEnd: () => void }) => <button disabled={!fadeOut} onClick={onTransitionEnd}>open</button> }));
vi.mock("@/components/reading/ReadingView", () => ({ default: ({ paragraphs, initialState }: { paragraphs: { sentences: { text: string }[] }[]; initialState: { progress: number; readingContentId?: string } }) => <div>reading<p>{paragraphs[0]?.sentences[0]?.text}</p><span data-testid="position">{initialState.progress}:{initialState.readingContentId}</span></div> }));
vi.mock("@/components/reading/ReadingHeader", () => ({ default: () => null }));
vi.mock("@/components/reading/ProgressFooter", () => ({ default: () => null }));
vi.mock("@/components/InfoModal", () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  navigation.search = "";
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

it("resets today's position before display and keeps the displayed text fixed during the session", async () => {
  const { createInitialState, saveTodayState, loadTodayState } = await import("@/lib/reading-state");
  saveTodayState({ ...createInitialState(100, "old"), progress: 12, viewPosition: 10, tapCount: 99 });
  const original = await vi.mocked(getWorkContent).getMockImplementation()!(100);
  vi.mocked(getWorkContent).mockResolvedValue({ ...original, readingContentId: "new" });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ today: { workId: 100 }, tomorrow: { workId: 200 }, prefetchEnabled: false }));
  const view = render(<ReadingClient />);
  await waitFor(() => expect((screen.getByText("open") as HTMLButtonElement).disabled).toBe(false), { timeout: 2000 });
  fireEvent.click(screen.getByText("open"));
  expect((await screen.findByTestId("position")).textContent).toBe("0:new");
  expect(screen.getByRole("status").textContent).toContain("先頭から再開");
  expect(loadTodayState()).toMatchObject({ readingContentId: "new", progress: 0, viewPosition: 0, tapCount: 99 });
  vi.mocked(getWorkContent).mockResolvedValue({ ...original, readingContentId: "future", blocks: [{ type: "paragraph", text: "未来の本文", nodes: [{ type: "text", text: "未来の本文" }] }] });
  view.rerender(<ReadingClient />);
  expect(screen.getByTestId("position").textContent).toBe("0:new");
  expect(screen.queryByText("未来の本文")).toBeNull();
});
it("resets bookshelf positions without touching completion history", async () => {
  const { saveBookshelf, loadBookshelf } = await import("@/lib/bookshelf");
  saveBookshelf([{ workId: 100, title: "履歴", author: "著者", firstLine: "本文", status: "favorite", favoriteAt: "2026-01-01", completedAt: "2026-01-02", readingTime: 10000, tapCount: 99, lastProgress: 10, lastViewPosition: 8, readingContentId: "old" }]);
  navigation.search = "source=bookshelf&workId=100";
  const original = await vi.mocked(getWorkContent).getMockImplementation()!(100);
  vi.mocked(getWorkContent).mockResolvedValue({ ...original, readingContentId: "new" });
  render(<ReadingClient />);
  await waitFor(() => expect((screen.getByText("open") as HTMLButtonElement).disabled).toBe(false), { timeout: 2000 });
  fireEvent.click(screen.getByText("open"));
  expect((await screen.findByTestId("position")).textContent).toBe("0:new");
  window.dispatchEvent(new Event("beforeunload"));
  expect(loadBookshelf()[0]).toMatchObject({ lastProgress: 0, lastViewPosition: 0, readingContentId: "new", completedAt: "2026-01-02", readingTime: 10000, tapCount: 99 });
  expect(prefetchWork).not.toHaveBeenCalled();
});
