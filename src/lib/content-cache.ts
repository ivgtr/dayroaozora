import type { WorkResponse, ContentBlock, Delivery, WorkErrorCode } from "@/types";

const CACHE_VERSION = 3;
export const REVALIDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface ContentCacheEntry {
  workId: number;
  title: string;
  author: string;
  blocks: string; // JSON.stringify(ContentBlock[])
  charCount: number;
  lastAccessedAt: number;
  version: number;
  checkedAt?: number;
  delivery?: Delivery;
  readingContentId?: string;
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

function validBlocks(value: unknown): value is ContentBlock[] {
  return Array.isArray(value) && value.every(block => block && (
    (block.type === "paragraph" && typeof block.text === "string" && Array.isArray(block.nodes) && block.nodes.every((node: { type?: string }) => node && ["text", "ruby", "emphasis", "bold", "annotation"].includes(node.type ?? ""))) ||
    (block.type === "heading" && typeof block.text === "string" && Number.isInteger(block.level)) || block.type === "separator"
  ));
}
function isValidEntry(entry: ContentCacheEntry): boolean {
  try {
    return (entry.version === 2 || entry.version === CACHE_VERSION) && typeof entry.blocks === "string" && validBlocks(JSON.parse(entry.blocks)) && Number.isInteger(entry.workId) && typeof entry.title === "string" && typeof entry.author === "string";
  } catch { return false; }
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

      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Cache transaction aborted"));
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

      tx.oncomplete = () => resolve();
      tx.onabort = () => resolve();
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

class PrefetchDisabledError extends Error {}

const inFlight = new Map<number, Promise<WorkResponse>>();
let prefetchDate = "";
const prefetchedIds = new Set<number>();

export function getWorkContent(workId: number): Promise<WorkResponse> {
  const deadline = Date.now() + 40_000;
  return sharedWorkContent(workId, false, deadline).catch(error => {
    if (error instanceof PrefetchDisabledError) return sharedWorkContent(workId, false, deadline);
    throw error;
  });
}

function sharedWorkContent(workId: number, prefetch: boolean, deadline = Date.now() + 40_000): Promise<WorkResponse> {
  const pending = inFlight.get(workId);
  if (pending) return pending;
  const controller = new AbortController();
  let available: WorkResponse | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const task = Promise.race([
    loadWorkContent(workId, prefetch, controller.signal, work => { available = work; }),
    new Promise<WorkResponse>((resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        if (available) resolve(available);
        else reject(new Error("Content loading timed out"));
      }, Math.max(0, deadline - Date.now()));
    }),
  ]).finally(() => { clearTimeout(timer); inFlight.delete(workId); });
  inFlight.set(workId, task);
  return task;
}

export class ContentRequestError extends Error {
  constructor(readonly code: WorkErrorCode, readonly retryable: boolean, message = "Failed to fetch work content") { super(message); }
}
const stopped = new Set<number>();
const stopKey = (id: number) => `dayro:content-stopped:${id}`;
function wasStopped(id: number): boolean {
  try { return stopped.has(id) || localStorage.getItem(stopKey(id)) === "1"; }
  catch { return stopped.has(id); }
}
async function markStopped(id: number) {
  stopped.add(id);
  try { localStorage.setItem(stopKey(id), "1"); } catch { /* IDB deletion remains available. */ }
  await deleteCacheEntry(id);
}
function clearStopped(id: number) {
  stopped.delete(id);
  try { localStorage.removeItem(stopKey(id)); } catch { /* Best effort. */ }
}
function fromCache(entry: ContentCacheEntry): WorkResponse {
  return { workId: entry.workId, title: entry.title, author: entry.author, blocks: JSON.parse(entry.blocks), charCount: entry.charCount, delivery: entry.delivery, readingContentId: entry.readingContentId };
}
function checkedTime(work: WorkResponse): number | undefined {
  const delivery = work.delivery;
  if (delivery?.verification !== "current" || delivery.metadataState !== "current" || !delivery.validatedAt || !delivery.sourceRevision || delivery.sourceRevision !== delivery.expectedSourceRevision) return undefined;
  const time = Date.parse(delivery.validatedAt);
  return Number.isFinite(time) && time <= Date.now() ? time : undefined;
}
async function loadWorkContent(workId: number, prefetch: boolean, signal: AbortSignal, acquired: (work: WorkResponse | undefined) => void): Promise<WorkResponse> {
  const blocked = wasStopped(workId);
  const cached = blocked ? null : await getCacheEntry(workId);
  signal.throwIfAborted();
  const local = cached ? fromCache(cached) : undefined;
  acquired(local);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (blocked && offline) throw new ContentRequestError("SOURCE_UNAVAILABLE", false);
  const fresh = cached?.checkedAt !== undefined && local !== undefined && checkedTime(local) !== undefined && cached.checkedAt <= checkedTime(local)! && cached.checkedAt <= Date.now() && Date.now() - cached.checkedAt < REVALIDATE_INTERVAL_MS;
  if (local && (prefetch || offline || fresh)) {
    try { await putCacheEntry({ ...cached!, lastAccessedAt: Date.now() }); } catch { /* Reading is still available. */ }
    return local;
  }
  let work: WorkResponse;
  try {
    const res = await fetch(`/api/works/${workId}${prefetch ? "?prefetch=1" : ""}`, { signal, cache: "no-cache" });
    if (res.status === 204 && prefetch) throw new PrefetchDisabledError();
    if (!res.ok) {
      let body: { code?: WorkErrorCode; retryable?: boolean } = {};
      try { body = await res.json(); } catch { /* Old errors may have no code. */ }
      const code = res.status === 404 ? "NOT_FOUND" : body.code ?? "INTERNAL_ERROR";
      throw new ContentRequestError(code, (code === "SOURCE_TEMPORARY_ERROR" || code === "SERVICE_UNAVAILABLE") && body.retryable === true);
    }
    const responseText = await res.text();
    try { work = JSON.parse(responseText); }
    catch { throw new ContentRequestError("SOURCE_INVALID_CONTENT", false); }
    if (!work || work.workId !== workId || !validBlocks(work.blocks) || typeof work.title !== "string" || typeof work.author !== "string" || (work.delivery && (!work.readingContentId || !work.readingContentId.startsWith(`${work.delivery.contentId}:`)))) throw new ContentRequestError("SOURCE_INVALID_CONTENT", false);
    signal.throwIfAborted();
  } catch (error) {
    if (error instanceof ContentRequestError && ["NOT_FOUND", "FORBIDDEN", "SOURCE_UNAVAILABLE", "SOURCE_INVALID_CONTENT"].includes(error.code)) {
      acquired(undefined);
      await markStopped(workId);
      throw error;
    }
    if (local && !(error instanceof PrefetchDisabledError) && (!(error instanceof ContentRequestError) || error.retryable)) {
      try { await putCacheEntry({ ...cached!, lastAccessedAt: Date.now() }); } catch { /* Preserve available text. */ }
      return local;
    }
    throw error;
  }
  if (blocked && checkedTime(work) === undefined) { acquired(undefined); throw new ContentRequestError("SOURCE_UNAVAILABLE", false); }
  acquired(work);
  clearStopped(workId);
  const entry: ContentCacheEntry = {
    workId, title: work.title, author: work.author, blocks: JSON.stringify(work.blocks), charCount: work.charCount,
    lastAccessedAt: Date.now(), version: CACHE_VERSION,
    checkedAt: checkedTime(work), delivery: work.delivery, readingContentId: work.readingContentId,
  };
  try { await putCacheEntry(entry); }
  catch (error) {
    if (!prefetch && error instanceof DOMException && error.name === "QuotaExceededError") {
      for (let i = 0; i < 3 && !signal.aborted; i++) {
        if (!await evictOldest()) break;
        try { await putCacheEntry(entry); break; } catch { /* Return fetched content even when saving fails. */ }
      }
    }
  }
  return work;
}

export async function prefetchWork(workId: number, date = new Date().toISOString().slice(0, 10)): Promise<void> {
  if (prefetchDate !== date) {
    prefetchDate = date;
    prefetchedIds.clear();
  }
  if (prefetchedIds.has(workId)) return;
  prefetchedIds.add(workId);
  try {
    const key = `dayro:prefetch-attempt:${workId}`;
    if (localStorage.getItem(key) === date) return;
    // Record before the first await so reloads also remember failed attempts.
    localStorage.setItem(key, date);
  } catch { /* Fall back to per-page suppression when storage is unavailable. */ }
  try {
    if (await getCacheEntry(workId)) return;
    await sharedWorkContent(workId, true);
  } catch {
    // One attempt per day/ID, including failure and operational disablement.
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
  stopped.clear();
  inFlight.clear();
  prefetchedIds.clear();
  prefetchDate = "";
  dbAvailable = null;
  cleanupDone = false;
}
