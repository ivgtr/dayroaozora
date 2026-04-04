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
    version: 2,
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
