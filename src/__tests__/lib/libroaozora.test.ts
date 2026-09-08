import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWork, WorkFetchError } from "@/lib/libroaozora";
import fixture from "../fixtures/047927.json";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchWork with captured 047927 content", () => {
  it("parses the official ZIP's decoded text and production metadata", async () => {
    vi.stubEnv("LIBROAOZORA_API_URL", "https://lb-api.ivgtr.me/");
    const fetchMock = vi.fn(async (url: URL) => {
      expect(url.pathname).toMatch(/^\/v1\/works\/047927(\/content)?$/);
      if (url.pathname.endsWith("/content")) {
        expect(url.search).toBe("?format=raw");
        return Response.json(fixture.body);
      }
      return Response.json(fixture.metadata);
    });
    vi.stubGlobal("fetch", fetchMock);

    const work = await fetchWork(47927);
    expect(work.title).toBe("春浅き日に");
    expect(work.author).toBe("堀 辰雄");
    expect(work.charCount).toBeGreaterThan(1000);
    expect(
      work.blocks.some(
        (block) => block.type === "paragraph" && block.text.includes("二三日前の或る温かな")
      )
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("identifies an upstream content 500 before parsing", async () => {
    vi.stubEnv("LIBROAOZORA_API_URL", "https://lb-api.ivgtr.me/");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) =>
        url.pathname.endsWith("/content")
          ? Response.json(
              { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
              { status: 500 }
            )
          : Response.json(fixture.metadata)
      )
    );
    await expect(fetchWork(47927)).rejects.toThrow("libroaozora API error (content): 500");
  });
});

it.each([
  new TypeError("terminated"),
  new DOMException("The operation was aborted", "AbortError"),
  new DOMException("The operation timed out", "TimeoutError"),
])("treats body reception failure as retryable: %s", async cause => {
  vi.stubEnv("LIBROAOZORA_API_URL", "https://example.test");
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"workId":"047927",'));
    },
    pull(controller) {
      controller.error(cause);
    },
  }));
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);

  const result = fetchWork(47927);
  await expect(result).rejects.toBeInstanceOf(WorkFetchError);
  await expect(result).rejects.toMatchObject({ code: "SOURCE_TEMPORARY_ERROR", retryable: true, cause });
  expect(fetchMock).toHaveBeenCalledOnce();
});

it.each(['{"workId":', "", "null", JSON.stringify({ ...fixture.body, content: "" })])(
  "rejects fully received invalid content without retrying: %s", async content => {
    vi.stubEnv("LIBROAOZORA_API_URL", "https://example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(content)));

    await expect(fetchWork(47927)).rejects.toMatchObject({ code: "SOURCE_INVALID_CONTENT", retryable: false });
  }
);

async function currentBody() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fixture.body.content));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  return { ...fixture.body, work: { ...fixture.metadata, title: "同じ世代の題名" }, delivery: {
    metadataGeneration: "new", metadataSyncedAt: new Date().toISOString(), metadataState: "current",
    sourceRevision: "a".repeat(64), expectedSourceRevision: "a".repeat(64), contentId: `aozora-decode-v1:${hash}`,
    verification: "current", validatedAt: new Date().toISOString(),
  } };
}
it("uses a single content response's work and delivery without mixing a detail generation", async () => {
  vi.stubEnv("LIBROAOZORA_API_URL", "https://example.test");
  const body = await currentBody();
  const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
  vi.stubGlobal("fetch", fetchMock);
  const result = await fetchWork(47927);
  expect(result.title).toBe("同じ世代の題名");
  expect(result.delivery).toEqual(body.delivery);
  expect(result.readingContentId).toBe(`${body.delivery.contentId}:dayro-structure-v1`);
  expect(fetchMock).toHaveBeenCalledOnce();
});
it.each(["identity", "hash", "generation", "missing"])("rejects inconsistent new contracts: %s", async problem => {
  vi.stubEnv("LIBROAOZORA_API_URL", "https://example.test");
  const body = await currentBody();
  if (problem === "identity") body.work.id = "000789";
  if (problem === "hash") body.content += "changed";
  if (problem === "generation") Object.assign(body.work, { metadataGeneration: "different" });
  if (problem === "missing") Object.assign(body, { work: undefined });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
  await expect(fetchWork(47927)).rejects.toHaveProperty("code", "SOURCE_INVALID_CONTENT");
});
it("classifies stable error codes independently of error wording", async () => {
  vi.stubEnv("LIBROAOZORA_API_URL", "https://example.test");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { code: "SOURCE_TEMPORARY_ERROR", message: "arbitrary wording" } }, { status: 503 })));
  await expect(fetchWork(47927)).rejects.toMatchObject({ code: "SOURCE_TEMPORARY_ERROR", retryable: true });
});
