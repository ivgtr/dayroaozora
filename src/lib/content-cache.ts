import type { WorkResponse } from "@/types";

export interface ContentCacheEntry {
  workId: number;
  title: string;
  author: string;
  content: string;
  charCount: number;
  lastAccessedAt: number;
}

const DB_NAME = "dayroaozora";
const STORE_NAME = "content_cache";
const DB_VERSION = 1;

let dbAvailable: boolean | null = null;
let cleanupDone = false;
let cachedDB: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "workId" });
        store.createIndex("lastAccessedAt", "lastAccessedAt", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getDB(): Promise<IDBDatabase | null> {
  if (dbAvailable === false) return null;
  if (cachedDB) return cachedDB;

  try {
    cachedDB = await openDB();
    dbAvailable = true;
    return cachedDB;
  } catch {
    dbAvailable = false;
    return null;
  }
}

function isValidEntry(entry: ContentCacheEntry): boolean {
  return (
    entry.content !== "" &&
    entry.charCount === entry.content.length
  );
}

export async function getCacheEntry(
  workId: number,
): Promise<ContentCacheEntry | null> {
  const db = await getDB();
  if (!db) return null;

  const entry = await new Promise<ContentCacheEntry | undefined>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(workId);

      request.onsuccess = () =>
        resolve(request.result as ContentCacheEntry | undefined);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });

  if (!entry) return null;

  if (!isValidEntry(entry)) {
    deleteCacheEntry(workId).catch(() => {});
    return null;
  }

  return entry;
}

export async function putCacheEntry(
  entry: ContentCacheEntry,
): Promise<void> {
  const db = await getDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function deleteCacheEntry(workId: number): Promise<void> {
  const db = await getDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(workId);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getAllExpired(maxAgeMs: number): Promise<number[]> {
  const db = await getDB();
  if (!db) return [];

  const threshold = Date.now() - maxAgeMs;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("lastAccessedAt");
      const range = IDBKeyRange.upperBound(threshold);
      const request = index.openCursor(range);
      const ids: number[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          ids.push((cursor.value as ContentCacheEntry).workId);
          cursor.continue();
        } else {
          resolve(ids);
        }
      };

      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function getOldestEntry(): Promise<number | null> {
  const db = await getDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("lastAccessedAt");
      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve((cursor.value as ContentCacheEntry).workId);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function evictOldest(): Promise<boolean> {
  const oldestId = await getOldestEntry();
  if (oldestId === null) return false;

  await deleteCacheEntry(oldestId);
  return true;
}

export async function getWorkContent(
  workId: number,
): Promise<WorkResponse> {
  const cached = await getCacheEntry(workId);

  if (cached) {
    putCacheEntry({ ...cached, lastAccessedAt: Date.now() }).catch(() => {});

    return {
      workId: cached.workId,
      title: cached.title,
      author: cached.author,
      content: cached.content,
      charCount: cached.charCount,
    };
  }

  const res = await fetch(`/api/works/${workId}`);
  if (!res.ok) throw new Error("Failed to fetch work content");
  const work: WorkResponse = await res.json();

  const entry: ContentCacheEntry = {
    workId: work.workId,
    title: work.title,
    author: work.author,
    content: work.content,
    charCount: work.charCount,
    lastAccessedAt: Date.now(),
  };

  try {
    await putCacheEntry(entry);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      for (let i = 0; i < 3; i++) {
        const evicted = await evictOldest();
        if (!evicted) break;
        try {
          await putCacheEntry(entry);
          break;
        } catch (retryErr) {
          if (
            !(
              retryErr instanceof DOMException &&
              retryErr.name === "QuotaExceededError"
            )
          ) {
            break;
          }
        }
      }
    }
  }

  return work;
}

export async function prefetchWork(workId: number): Promise<void> {
  try {
    const existing = await getCacheEntry(workId);
    if (existing) return;

    const res = await fetch(`/api/works/${workId}`);
    if (!res.ok) return;
    const work: WorkResponse = await res.json();

    const entry: ContentCacheEntry = {
      workId: work.workId,
      title: work.title,
      author: work.author,
      content: work.content,
      charCount: work.charCount,
      lastAccessedAt: Date.now(),
    };

    await putCacheEntry(entry);
  } catch {
    // best-effort: silent failure
  }
}

export async function cleanupExpiredCache(
  maxAgeDays: number = 30,
): Promise<number> {
  if (cleanupDone) return 0;
  cleanupDone = true;

  const db = await getDB();
  if (!db) return 0;

  try {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const expiredIds = await getAllExpired(maxAgeMs);

    for (const id of expiredIds) {
      await deleteCacheEntry(id);
    }

    return expiredIds.length;
  } catch {
    return 0;
  }
}

export function _resetForTesting(): void {
  if (cachedDB) {
    cachedDB.close();
    cachedDB = null;
  }
  dbAvailable = null;
  cleanupDone = false;
}
