import { NextResponse } from "next/server";
import { getTodayWork, getSecondsUntilJstMidnight } from "@/lib/daily-work";

export async function GET() {
  try {
    const now = new Date();
    const data = await getTodayWork(now);
    const maxAge = getSecondsUntilJstMidnight(now);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `s-maxage=${maxAge}`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load work list" },
      { status: 500 }
    );
  }
}
