import type { WorkResponse } from "@/types";

interface LibroaozoraWork {
  workId: number;
  title: string;
  author: string;
  content: string;
  charCount?: number;
}

export async function fetchWork(workId: number): Promise<WorkResponse> {
  const baseUrl = process.env.LIBROAOZORA_API_URL;
  if (!baseUrl) {
    throw new Error("LIBROAOZORA_API_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/works/${workId}?format=plain`);

  if (response.status === 404) {
    throw new WorkNotFoundError(workId);
  }

  if (!response.ok) {
    throw new Error(`libroaozora API error: ${response.status}`);
  }

  const data: LibroaozoraWork = await response.json();

  return {
    workId: data.workId,
    title: data.title,
    author: data.author,
    content: data.content,
    charCount: data.charCount ?? data.content.length,
  };
}

export class WorkNotFoundError extends Error {
  constructor(workId: number) {
    super(`Work not found: ${workId}`);
    this.name = "WorkNotFoundError";
  }
}
