import type { WorkResponse } from "@/types";
import { parseStructured } from "@/lib/aozora";

interface LibroaozoraMetadata {
  id: string;
  title: string;
  authors: { lastName: string; firstName: string; role: string }[];
}

interface LibroaozoraContent {
  workId: string;
  format: string;
  content: string;
}

function padWorkId(workId: number): string {
  return String(workId).padStart(6, "0");
}

function formatAuthor(authors: LibroaozoraMetadata["authors"]): string {
  const author = authors.find((a) => a.role === "author") ?? authors[0];
  return author ? `${author.lastName} ${author.firstName}` : "";
}

export async function fetchWork(workId: number): Promise<WorkResponse> {
  const baseUrl = process.env.LIBROAOZORA_API_URL;
  if (!baseUrl) {
    throw new Error("LIBROAOZORA_API_URL is not configured");
  }

  const id = padWorkId(workId);
  const metaUrl = new URL(`/v1/works/${id}`, baseUrl);
  const contentUrl = new URL(`/v1/works/${id}/content?format=raw`, baseUrl);
  const [metaRes, contentRes] = await Promise.all([
    fetch(metaUrl),
    fetch(contentUrl),
  ]);

  if (metaRes.status === 404 || contentRes.status === 404) {
    throw new WorkNotFoundError(workId);
  }
  if (!metaRes.ok) {
    throw new Error(`libroaozora API error (metadata): ${metaRes.status}`);
  }
  if (!contentRes.ok) {
    throw new Error(`libroaozora API error (content): ${contentRes.status}`);
  }

  const meta: LibroaozoraMetadata = await metaRes.json();
  const body: LibroaozoraContent = await contentRes.json();

  const structured = parseStructured(body.content);
  const charCount = structured.blocks.reduce((sum, b) => {
    if (b.type === "paragraph") return sum + b.text.length;
    return sum;
  }, 0);

  return {
    workId,
    title: meta.title,
    author: formatAuthor(meta.authors),
    blocks: structured.blocks,
    charCount,
  };
}

export class WorkNotFoundError extends Error {
  constructor(workId: number) {
    super(`Work not found: ${workId}`);
    this.name = "WorkNotFoundError";
  }
}
