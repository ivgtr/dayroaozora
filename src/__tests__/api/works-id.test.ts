import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/works/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/libroaozora", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/libroaozora")>();
  return {
    WorkNotFoundError: actual.WorkNotFoundError,
    fetchWork: vi.fn().mockResolvedValue({
      workId: 12345,
      title: "走れメロス",
      author: "太宰治",
      content: "メロスは激怒した。",
      charCount: 9,
    }),
  };
});

function createRequest(id: string) {
  return new NextRequest(`http://localhost:3000/api/works/${id}`);
}

function createParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/works/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns work data for a valid ID", async () => {
    const response = await GET(createRequest("12345"), createParams("12345"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workId).toBe(12345);
    expect(data.title).toBe("走れメロス");
    expect(data.author).toBe("太宰治");
    expect(data.content).toBe("メロスは激怒した。");
    expect(data.charCount).toBe(9);
  });

  it("sets Cache-Control header with s-maxage and swr", async () => {
    const response = await GET(createRequest("12345"), createParams("12345"));
    const cacheControl = response.headers.get("Cache-Control");

    expect(cacheControl).toBe("s-maxage=3600, stale-while-revalidate=86400");
  });

  it("returns 400 for non-numeric ID", async () => {
    const response = await GET(createRequest("abc"), createParams("abc"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid work ID");
  });

  it("returns 400 for zero ID", async () => {
    const response = await GET(createRequest("0"), createParams("0"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid work ID");
  });

  it("returns 400 for negative ID", async () => {
    const response = await GET(createRequest("-1"), createParams("-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid work ID");
  });

  it("returns 404 when work is not found", async () => {
    const { fetchWork, WorkNotFoundError } = await import("@/lib/libroaozora");
    vi.mocked(fetchWork).mockRejectedValueOnce(new WorkNotFoundError(99999));

    const response = await GET(createRequest("99999"), createParams("99999"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Work not found");
  });

  it("returns 502 when libroaozora API fails", async () => {
    const { fetchWork } = await import("@/lib/libroaozora");
    vi.mocked(fetchWork).mockRejectedValueOnce(new Error("libroaozora API error: 503"));

    const response = await GET(createRequest("12345"), createParams("12345"));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to fetch work data");
  });
});
