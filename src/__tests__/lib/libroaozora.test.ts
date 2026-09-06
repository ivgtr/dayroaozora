import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWork } from "@/lib/libroaozora";
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
