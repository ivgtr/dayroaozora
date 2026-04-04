import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/today/route";

vi.mock("@/lib/id-list", () => ({
  getIdList: vi.fn().mockResolvedValue([100, 200, 300, 400, 500]),
}));

describe("GET /api/today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns today and tomorrow work IDs", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("today");
    expect(data).toHaveProperty("tomorrow");
    expect(data.today).toHaveProperty("workId");
    expect(data.today).toHaveProperty("date");
    expect(data.tomorrow).toHaveProperty("workId");
    expect(data.tomorrow).toHaveProperty("date");
  });

  it("returns numeric workIds", async () => {
    const response = await GET();
    const data = await response.json();

    expect(typeof data.today.workId).toBe("number");
    expect(typeof data.tomorrow.workId).toBe("number");
  });

  it("sets Cache-Control header with s-maxage", async () => {
    const response = await GET();
    const cacheControl = response.headers.get("Cache-Control");

    expect(cacheControl).toMatch(/s-maxage=\d+/);
  });

  it("returns dates in YYYY-MM-DD format", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.today.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.tomorrow.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns 500 when ID list loading fails", async () => {
    const { getIdList } = await import("@/lib/id-list");
    vi.mocked(getIdList).mockRejectedValueOnce(new Error("R2 unavailable"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to load work list");
  });
});
