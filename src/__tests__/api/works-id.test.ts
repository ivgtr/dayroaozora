import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/works/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/libroaozora", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/libroaozora")>();
  return {
    WorkNotFoundError: actual.WorkNotFoundError,
    WorkFetchError: actual.WorkFetchError,
    fetchWork: vi.fn().mockResolvedValue({
      delivery: { verification: "current" },
      workId: 12345,
      title: "走れメロス",
      author: "太宰治",
      blocks: [{ type: "paragraph", text: "メロスは激怒した。", nodes: [{ type: "text", text: "メロスは激怒した。" }] }],
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
    vi.unstubAllEnvs();
  });

  it("returns work data for a valid ID", async () => {
    const response = await GET(createRequest("12345"), createParams("12345"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workId).toBe(12345);
    expect(data.title).toBe("走れメロス");
    expect(data.author).toBe("太宰治");
    expect(data.blocks).toHaveLength(1);
    expect(data.blocks[0].text).toBe("メロスは激怒した。");
    expect(data.charCount).toBe(9);
  });

  it("sets a one-hour CDN lifetime without stale-while-revalidate", async () => {
    const response = await GET(createRequest("12345"), createParams("12345"));
    const cacheControl = response.headers.get("Cache-Control");

    expect(cacheControl).toBe("s-maxage=3600");
  });

  it("disables prefetch at the relay while keeping ordinary reads available", async () => {
    vi.stubEnv("PREFETCH_ENABLED", "false");
    const { fetchWork } = await import("@/lib/libroaozora");
    const response = await GET(new NextRequest("http://localhost/api/works/12345?prefetch=1"), createParams("12345"));
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchWork).not.toHaveBeenCalled();
    expect((await GET(createRequest("12345"), createParams("12345"))).status).toBe(200);
  });

  it("never shares stale or unverified responses", async () => {
    const { fetchWork } = await import("@/lib/libroaozora");
    for (const verification of ["stale", "unverified"] as const) {
      vi.mocked(fetchWork).mockResolvedValueOnce({ workId: 1, title: "", author: "", blocks: [], charCount: 0, delivery: { metadataGeneration: "g", metadataSyncedAt: null, metadataState: "legacy", sourceRevision: null, expectedSourceRevision: null, contentId: "id", verification, validatedAt: null } });
      expect((await GET(createRequest("1"), createParams("1"))).headers.get("Cache-Control")).toBe("no-store");
    }
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
    const error = new Error("libroaozora API error (content): 500");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchWork).mockRejectedValueOnce(error);

    const response = await GET(createRequest("12345"), createParams("12345"));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to fetch work data");
    expect(log).toHaveBeenCalledWith("Failed to fetch work data", { workId: 12345, error });
    log.mockRestore();
  });
});
