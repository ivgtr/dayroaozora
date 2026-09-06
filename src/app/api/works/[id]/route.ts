import { NextRequest, NextResponse } from "next/server";
import { fetchWork, WorkNotFoundError, WorkFetchError } from "@/lib/libroaozora";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workId = Number(id);

  if (!Number.isInteger(workId) || workId <= 0) {
    return NextResponse.json({ error: "Invalid work ID" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (_request.nextUrl.searchParams.get("prefetch") === "1" && process.env.PREFETCH_ENABLED === "false") {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const data = await fetchWork(workId);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": data.delivery?.verification === "current" ? "s-maxage=3600, stale-while-revalidate=86400" : "no-store",
      },
    });
  } catch (error) {
    if (error instanceof WorkNotFoundError) {
      return NextResponse.json({ error: "Work not found", code: "NOT_FOUND", retryable: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    console.error("Failed to fetch work data", { workId, error });
    return NextResponse.json({ error: "Failed to fetch work data", code: error instanceof WorkFetchError ? error.code : "INTERNAL_ERROR", retryable: error instanceof WorkFetchError ? error.retryable : false }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
