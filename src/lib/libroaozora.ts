import type { WorkResponse, Delivery, WorkErrorCode } from "@/types";
import { parseStructured } from "@/lib/aozora";

interface LibroaozoraMetadata {
  id: string;
  title: string;
  copyrightFlag?: boolean;
  metadataGeneration?: string;
  authors: { lastName: string; firstName: string; role: string }[];
}
interface LibroaozoraContent {
  workId: string;
  format: string;
  content: string;
  work?: LibroaozoraMetadata;
  delivery?: Delivery;
}
export const STRUCTURE_VERSION = "dayro-structure-v1";
export class WorkFetchError extends Error {
  constructor(message: string, readonly code: WorkErrorCode, readonly retryable: boolean, options?: ErrorOptions) { super(message, options); }
}
export class WorkNotFoundError extends WorkFetchError {
  constructor(workId: number) { super(`Work not found: ${workId}`, "NOT_FOUND", false); this.name = "WorkNotFoundError"; }
}
const codes: WorkErrorCode[] = ["NOT_FOUND", "FORBIDDEN", "SOURCE_UNAVAILABLE", "SOURCE_TEMPORARY_ERROR", "SOURCE_INVALID_CONTENT", "SERVICE_UNAVAILABLE", "INTERNAL_ERROR"];
const retryableCode = (code: WorkErrorCode) => code === "SOURCE_TEMPORARY_ERROR" || code === "SERVICE_UNAVAILABLE";
async function checkedFetch(url: URL, signal: AbortSignal, stage: string, workId: number): Promise<Response> {
  let response: Response;
  try { response = await fetch(url, { signal, cache: "no-store" }); }
  catch (cause) { throw new WorkFetchError("Upstream network failure", "SOURCE_TEMPORARY_ERROR", true, { cause }); }
  if (response.ok) return response;
  let code: WorkErrorCode = response.status === 404 ? "NOT_FOUND" : response.status === 403 ? "FORBIDDEN" : response.status === 503 ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR";
  try {
    const body = await response.json();
    if (codes.includes(body?.error?.code)) code = body.error.code;
  } catch { /* Old upstream may return no JSON error contract. */ }
  if (code === "NOT_FOUND") throw new WorkNotFoundError(workId);
  throw new WorkFetchError(`libroaozora API error (${stage}): ${response.status}`, code, retryableCode(code));
}
async function rawHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
export async function fetchWork(workId: number): Promise<WorkResponse> {
  const baseUrl = process.env.LIBROAOZORA_API_URL;
  if (!baseUrl) throw new WorkFetchError("LIBROAOZORA_API_URL is not configured", "INTERNAL_ERROR", false);
  const id = String(workId).padStart(6, "0");
  const signal = AbortSignal.timeout(30_000);
  const response = await checkedFetch(new URL(`/v1/works/${id}/content?format=raw`, baseUrl), signal, "content", workId);
  let responseText: string;
  try { responseText = await response.text(); }
  catch (cause) { throw new WorkFetchError("Upstream network failure", "SOURCE_TEMPORARY_ERROR", true, { cause }); }
  let body: LibroaozoraContent;
  try { body = JSON.parse(responseText); }
  catch (cause) { throw new WorkFetchError("Invalid upstream response", "SOURCE_INVALID_CONTENT", false, { cause }); }
  if (!body || body.workId !== id || body.format !== "raw" || typeof body.content !== "string" || !body.content.trim()) throw new WorkFetchError("Invalid upstream content", "SOURCE_INVALID_CONTENT", false);
  const contentId = `aozora-decode-v1:${await rawHash(body.content)}`;
  let meta: LibroaozoraMetadata;
  let delivery: Delivery;
  if (body.work !== undefined || body.delivery !== undefined) {
    if (!body.work || !body.delivery) throw new WorkFetchError("Incomplete upstream delivery", "SOURCE_INVALID_CONTENT", false);
    meta = body.work;
    delivery = body.delivery;
    if (meta.copyrightFlag === true) throw new WorkFetchError("Content forbidden", "FORBIDDEN", false);
    const validRevision = (value: unknown) => value === null || (typeof value === "string" && /^[a-f0-9]{64}$/.test(value));
    if (meta.copyrightFlag !== false || !delivery.metadataGeneration || !["current", "previous", "legacy"].includes(delivery.metadataState) || !["current", "stale", "unverified"].includes(delivery.verification) || !validRevision(delivery.sourceRevision) || !validRevision(delivery.expectedSourceRevision) || delivery.contentId !== contentId || (meta.metadataGeneration !== undefined && meta.metadataGeneration !== delivery.metadataGeneration) || (delivery.verification === "current" && (delivery.metadataState !== "current" || !delivery.sourceRevision || delivery.sourceRevision !== delivery.expectedSourceRevision || !delivery.validatedAt || !Number.isFinite(Date.parse(delivery.validatedAt))))) {
      throw new WorkFetchError("Inconsistent upstream delivery", "SOURCE_INVALID_CONTENT", false);
    }
  } else {
    const detail = await checkedFetch(new URL(`/v1/works/${id}`, baseUrl), signal, "metadata", workId);
    meta = await detail.json();
    delivery = { metadataGeneration: "legacy", metadataSyncedAt: null, metadataState: "legacy", sourceRevision: null, expectedSourceRevision: null, contentId, verification: "unverified", validatedAt: null };
  }
  if (!meta || meta.id !== id || typeof meta.title !== "string" || !Array.isArray(meta.authors)) throw new WorkFetchError("Invalid upstream work", "SOURCE_INVALID_CONTENT", false);
  const author = meta.authors.find(a => a.role === "author") ?? meta.authors[0];
  const structured = parseStructured(body.content);
  return {
    workId, title: meta.title, author: author ? `${author.lastName} ${author.firstName}` : "",
    blocks: structured.blocks,
    charCount: structured.blocks.reduce((sum, block) => sum + (block.type === "paragraph" ? block.text.length : 0), 0),
    delivery, readingContentId: `${contentId}:${STRUCTURE_VERSION}`,
  };
}
