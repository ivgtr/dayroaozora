// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCacheEntry,
  putCacheEntry,
  deleteCacheEntry,
  getAllExpired,
  evictOldest,
  getWorkContent,
  prefetchWork,
  cleanupExpiredCache,
  _resetForTesting,
} from "@/lib/content-cache";
import type { ContentCacheEntry } from "@/lib/content-cache";

const TEST_BLOCKS = JSON.stringify([
  { type: "paragraph", text: "本文テスト", nodes: [{ type: "text", text: "本文テスト" }] },
]);

function makeEntry(overrides: Partial<ContentCacheEntry> = {}): ContentCacheEntry {
  return {
    workId: 100,
    title: "テスト作品",
    author: "テスト著者",
    blocks: TEST_BLOCKS,
    charCount: 5,
    lastAccessedAt: Date.now(),
    version: 3,
    checkedAt: Date.now(),
    readingContentId: "original:structure-v1",
    delivery: { metadataGeneration: "g", metadataSyncedAt: null, metadataState: "current", sourceRevision: "a".repeat(64), expectedSourceRevision: "a".repeat(64), contentId: "original", verification: "current", validatedAt: new Date().toISOString() },
    ...overrides,
  };
}

function clearIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("dayroaozora");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

beforeEach(async () => {
  _resetForTesting();
  localStorage.clear();
  await clearIndexedDB();
  vi.restoreAllMocks();
});

describe("IndexedDB wrapper CRUD", () => {
  it("put and get roundtrip", async () => {
    const entry = makeEntry();
    await putCacheEntry(entry);
    const result = await getCacheEntry(100);
    expect(result).not.toBeNull();
    expect(result!.workId).toBe(100);
    expect(result!.blocks).toBe(TEST_BLOCKS);
    expect(result!.title).toBe("テスト作品");
    expect(result!.author).toBe("テスト著者");
  });

  it("get non-existent returns null", async () => {
    const result = await getCacheEntry(999);
    expect(result).toBeNull();
  });

  it("delete removes entry", async () => {
    await putCacheEntry(makeEntry());
    await deleteCacheEntry(100);
    const result = await getCacheEntry(100);
    expect(result).toBeNull();
  });

  it("put overwrites existing entry", async () => {
    await putCacheEntry(makeEntry());
    const newBlocks = JSON.stringify([
      { type: "paragraph", text: "更新後", nodes: [{ type: "text", text: "更新後" }] },
    ]);
    const updated = makeEntry({ blocks: newBlocks, charCount: 3 });
    await putCacheEntry(updated);
    const result = await getCacheEntry(100);
    expect(result!.blocks).toBe(newBlocks);
  });
});

describe("Cache entry validation", () => {
  it("rejects entry with empty blocks", async () => {
    const entry = makeEntry({ blocks: "", charCount: 0 });
    await putCacheEntry(entry);
    const result = await getCacheEntry(100);
    expect(result).toBeNull();
  });

  it("rejects entry with wrong version", async () => {
    const entry = makeEntry({ version: 1 });
    await putCacheEntry(entry);
    const result = await getCacheEntry(100);
    expect(result).toBeNull();
  });
});

describe("getAllExpired", () => {
  it("returns expired entry IDs", async () => {
    const old = makeEntry({ workId: 1, lastAccessedAt: 1000 });
    const recent = makeEntry({ workId: 2, lastAccessedAt: Date.now() });
    await putCacheEntry(old);
    await putCacheEntry(recent);

    const expired = await getAllExpired(1000);
    expect(expired).toContain(1);
    expect(expired).not.toContain(2);
  });
});

describe("evictOldest", () => {
  it("deletes the oldest entry", async () => {
    await putCacheEntry(makeEntry({ workId: 1, lastAccessedAt: 1000 }));
    await putCacheEntry(makeEntry({ workId: 2, lastAccessedAt: 2000 }));

    const evicted = await evictOldest();
    expect(evicted).toBe(true);

    const entry1 = await getCacheEntry(1);
    const entry2 = await getCacheEntry(2);
    expect(entry1).toBeNull();
    expect(entry2).not.toBeNull();
  });

  it("returns false when no entries", async () => {
    const evicted = await evictOldest();
    expect(evicted).toBe(false);
  });
});

describe("getWorkContent", () => {
  it("returns from cache on hit without fetch", async () => {
    const entry = makeEntry();
    await putCacheEntry(entry);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await getWorkContent(100);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.workId).toBe(100);
    expect(result.blocks).toEqual(JSON.parse(TEST_BLOCKS));
    expect(result.title).toBe("テスト作品");
  });

  it("updates lastAccessedAt on cache hit", async () => {
    const entry = makeEntry({ lastAccessedAt: 1000 });
    await putCacheEntry(entry);

    await getWorkContent(100);

    await new Promise((r) => setTimeout(r, 50));
    const updated = await getCacheEntry(100);
    expect(updated!.lastAccessedAt).toBeGreaterThan(1000);
  });

  it("fetches from API on cache miss and stores", async () => {
    const mockBlocks = [
      { type: "paragraph", text: "API本文", nodes: [{ type: "text", text: "API本文" }] },
    ];
    const mockWork = {
      workId: 200,
      title: "API作品",
      author: "API著者",
      blocks: mockBlocks,
      charCount: 4,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockWork), { status: 200 }),
    );

    const result = await getWorkContent(200);
    expect(result).toEqual(mockWork);

    const cached = await getCacheEntry(200);
    expect(cached).not.toBeNull();
    expect(cached!.blocks).toBe(JSON.stringify(mockBlocks));
  });

  it("throws on API failure with cache miss", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 }),
    );

    await expect(getWorkContent(999)).rejects.toThrow(
      "Failed to fetch work content",
    );
  });
});

describe("prefetchWork", () => {
  it("preserves existing text when prefetch saving exceeds quota", async () => {
    await putCacheEntry(makeEntry());
    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...prefetchTestWork(), workId: 200 }));
    await prefetchWork(200);
    expect(put).toHaveBeenCalledOnce();
    expect(await getCacheEntry(100)).not.toBeNull();
    expect(await getCacheEntry(200)).toBeNull();
  });

  it("still evicts for an explicit read when saving exceeds quota", async () => {
    await putCacheEntry(makeEntry());
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...prefetchTestWork(), workId: 200 }));
    expect((await getWorkContent(200)).workId).toBe(200);
    expect(await getCacheEntry(100)).toBeNull();
    expect(await getCacheEntry(200)).not.toBeNull();
  });

  it("remembers failure across module reloads, permits other IDs and retries next day", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await prefetchWork(300, "2026-09-06");
    _resetForTesting();
    vi.resetModules();
    const reloaded = await import("@/lib/content-cache");
    try {
      await reloaded.prefetchWork(300, "2026-09-06");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await expect(reloaded.getWorkContent(300)).rejects.toThrow("offline");
      expect(fetchMock).toHaveBeenLastCalledWith("/api/works/300", expect.anything());
      await reloaded.prefetchWork(301, "2026-09-06");
      await reloaded.prefetchWork(300, "2026-09-07");
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally { reloaded._resetForTesting(); }
  });

  it("suppresses repeated attempts in memory when localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await prefetchWork(300, "2026-09-06");
    await prefetchWork(300, "2026-09-06");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fetches and stores when not cached", async () => {
    const mockBlocks = [
      { type: "paragraph", text: "明日の本文", nodes: [{ type: "text", text: "明日の本文" }] },
    ];
    const mockWork = {
      workId: 300,
      title: "明日の作品",
      author: "明日の著者",
      blocks: mockBlocks,
      charCount: 5,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockWork), { status: 200 }),
    );

    await prefetchWork(300);

    const cached = await getCacheEntry(300);
    expect(cached).not.toBeNull();
    expect(cached!.title).toBe("明日の作品");
  });

  it("skips fetch when already cached", async () => {
    await putCacheEntry(makeEntry({ workId: 300 }));

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await prefetchWork(300);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("marks prefetch requests and does not repeat failure on the same day", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await prefetchWork(300, "2026-09-06");
    await prefetchWork(300, "2026-09-06");
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/works/300?prefetch=1", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    await prefetchWork(300, "2026-09-07");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails silently on fetch error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    await expect(prefetchWork(300)).resolves.toBeUndefined();
  });
});

describe("cleanupExpiredCache", () => {
  it("deletes expired entries", async () => {
    const old = makeEntry({ workId: 1, lastAccessedAt: 1000 });
    const recent = makeEntry({ workId: 2, lastAccessedAt: Date.now() });
    await putCacheEntry(old);
    await putCacheEntry(recent);

    const count = await cleanupExpiredCache(30);

    expect(count).toBe(1);
    expect(await getCacheEntry(1)).toBeNull();
    expect(await getCacheEntry(2)).not.toBeNull();
  });

  it("runs only once per session", async () => {
    await putCacheEntry(makeEntry({ workId: 1, lastAccessedAt: 1000 }));

    const first = await cleanupExpiredCache(30);
    expect(first).toBe(1);

    await putCacheEntry(makeEntry({ workId: 3, lastAccessedAt: 1000 }));

    const second = await cleanupExpiredCache(30);
    expect(second).toBe(0);
  });
});

describe("offline/failure scenarios", () => {
  it("returns cached data when API would fail", async () => {
    await putCacheEntry(makeEntry({ workId: 500 }));

    const result = await getWorkContent(500);
    expect(result.workId).toBe(500);
    expect(result.blocks).toEqual(JSON.parse(TEST_BLOCKS));
  });

  it("throws when API fails and no cache", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    await expect(getWorkContent(600)).rejects.toThrow();
  });
});

it("bounds the complete content load when the network stalls", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("indexedDB", undefined);
  vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
  try {
    const result = getWorkContent(98765);
    const assertion = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(40_000);
    await assertion;
  } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
});

it.each([false, true])("keeps the original deadline after a delayed prefetch 204 (save stalls: %s)", async saveStalls => {
  await getCacheEntry(100);
  vi.useFakeTimers();
  const store = { get: () => { throw new Error("cache miss"); }, put: () => ({}) };
  vi.spyOn(IDBDatabase.prototype, "transaction").mockReturnValue({ objectStore: () => store } as unknown as IDBTransaction);
  let respond!: (response: Response) => void;
  const fetchMock = vi.spyOn(globalThis, "fetch")
    .mockImplementationOnce(() => new Promise(resolve => { respond = resolve; }))
    .mockImplementationOnce(() => saveStalls ? Promise.resolve(Response.json(prefetchTestWork())) : new Promise(() => {}));
  try {
    const prefetch = prefetchWork(100);
    await vi.advanceTimersByTimeAsync(0);
    const reading = getWorkContent(100);
    let settled = false;
    void reading.then(() => { settled = true; }, () => { settled = true; });
    const assertion = saveStalls ? expect(reading).resolves.toHaveProperty("workId", 100) : expect(reading).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(39_000);
    respond(new Response(null, { status: 204 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/works/100", expect.anything());
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    await prefetch;
    expect((fetchMock.mock.calls[1][1]?.signal as AbortSignal).aborted).toBe(true);
  } finally { vi.useRealTimers(); }
});


function prefetchTestWork() {
  return { workId: 100, title: "本文", author: "著者", blocks: JSON.parse(TEST_BLOCKS), charCount: 5 };
}
function apiWork(checkedAt: number, verification: "current" | "stale" | "unverified" = "current") {
  const entry = makeEntry();
  return { workId: 100, title: "新版", author: "著者", blocks: JSON.parse(TEST_BLOCKS), charCount: 5, readingContentId: "new:structure-v1", delivery: { ...entry.delivery!, contentId: "new", verification, validatedAt: verification === "current" ? new Date(checkedAt).toISOString() : null } };
}
it("migrates legacy v2 as unverified, retaining offline reading", async () => {
  await putCacheEntry(makeEntry({ version: 2, checkedAt: undefined, delivery: undefined, readingContentId: undefined }));
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const fetchMock = vi.spyOn(globalThis, "fetch");
  expect((await getWorkContent(100)).title).toBe("テスト作品");
  expect(fetchMock).not.toHaveBeenCalled();
  expect((await getCacheEntry(100))?.checkedAt).toBeUndefined();
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(apiWork(Date.now())));
  expect((await getWorkContent(100)).title).toBe("新版");
  expect((await getCacheEntry(100))?.version).toBe(3);
});
it("does not extend the check interval on daily access and revalidates at 24 hours", async () => {
  const start = Date.now();
  await putCacheEntry(makeEntry({ checkedAt: start, delivery: { ...makeEntry().delivery!, validatedAt: new Date(start).toISOString() } }));
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(start + 24 * 60 * 60 * 1000 - 1);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(apiWork(start)));
    await getWorkContent(100);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await getCacheEntry(100))?.checkedAt).toBe(start);
    vi.setSystemTime(Date.now() + 1);
    await getWorkContent(100);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((await getCacheEntry(100))?.checkedAt).toBe(start); // Old CDN timestamp is preserved.
  } finally { vi.useRealTimers(); }
});
it.each(["stale", "unverified"] as const)("does not confirm %s responses", async verification => {
  await putCacheEntry(makeEntry({ checkedAt: 0 }));
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(apiWork(Date.now(), verification)));
  await getWorkContent(100);
  expect((await getCacheEntry(100))?.checkedAt).toBeUndefined();
});
it("uses normal saved content on temporary failure without advancing checkedAt", async () => {
  await putCacheEntry(makeEntry({ checkedAt: 0 }));
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "down", code: "SOURCE_TEMPORARY_ERROR", retryable: true }, { status: 502 }));
  expect((await getWorkContent(100)).title).toBe("テスト作品");
  expect((await getCacheEntry(100))?.checkedAt).toBe(0);
});
it.each(["NOT_FOUND", "FORBIDDEN", "SOURCE_UNAVAILABLE", "SOURCE_INVALID_CONTENT"])("invalidates saved text after %s, including a subsequent offline open", async code => {
  await putCacheEntry(makeEntry({ checkedAt: 0 }));
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code, retryable: false }, { status: 502 }));
  await expect(getWorkContent(100)).rejects.toHaveProperty("code", code);
  expect(await getCacheEntry(100)).toBeNull();
  _resetForTesting(); // Persisted stop marker survives a module reload.
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  await expect(getWorkContent(100)).rejects.toHaveProperty("code", "SOURCE_UNAVAILABLE");
});
it("does not report an aborted IDB transaction as a successful write", async () => {
  const original = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args: Parameters<typeof original>) {
    const request = original.apply(this, args);
    request.addEventListener("success", () => this.transaction.abort());
    return request;
  });
  await expect(putCacheEntry(makeEntry())).rejects.toThrow();
  expect(await getCacheEntry(100)).toBeNull();
});

it("composes daily publication, a 60-second pointer delay and a one-hour CDN response with the browser's 24-hour check interval", async () => {
  const start = Date.parse("2026-09-06T00:00:00Z");
  const day = 24 * 60 * 60 * 1000;
  const pointerCheckedBeforePublication = start + day - 1000;
  // The source changes just after the first daily sync. A CDN object is filled
  // during the last second of the old pointer's 60-second validity.
  const cdnFilled = start + day + 58_000;
  const cdnExpires = cdnFilled + 60 * 60 * 1000;
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(start);
    await putCacheEntry(makeEntry({ checkedAt: start, delivery: { ...makeEntry().delivery!, validatedAt: new Date(start).toISOString() } }));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(Date.now() < cdnExpires
      ? { ...apiWork(pointerCheckedBeforePublication), title: "CDNに残る旧版" }
      : { ...apiWork(Date.now()), title: "公開済みの訂正版" }));
    vi.setSystemTime(cdnFilled);
    expect((await getWorkContent(100)).title).toBe("CDNに残る旧版");
    expect((await getCacheEntry(100))?.checkedAt).toBe(pointerCheckedBeforePublication);
    vi.setSystemTime(cdnExpires);
    expect((await getWorkContent(100)).title).toBe("CDNに残る旧版");
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.setSystemTime(pointerCheckedBeforePublication + day);
    expect((await getWorkContent(100)).title).toBe("公開済みの訂正版");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally { vi.useRealTimers(); }
});
