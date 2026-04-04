import { NextRequest, NextResponse } from "next/server";
import { fetchWork, WorkNotFoundError } from "@/lib/libroaozora";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workId = Number(id);

  if (!Number.isInteger(workId) || workId <= 0) {
    return NextResponse.json({ error: "Invalid work ID" }, { status: 400 });
  }

  try {
    const data = await fetchWork(workId);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    if (error instanceof WorkNotFoundError) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to fetch work data" }, { status: 502 });
  }
}
