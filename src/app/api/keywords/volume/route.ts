import { NextRequest, NextResponse } from "next/server";
import { getSearchVolume } from "@/lib/dataforseo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, location } = body;

    if (!keywords?.length || !location) {
      return NextResponse.json(
        { error: "keywords array and location are required" },
        { status: 400 }
      );
    }

    if (keywords.length > 1000) {
      return NextResponse.json(
        { error: "Maximum 1000 keywords per request" },
        { status: 400 }
      );
    }

    const response = await getSearchVolume(keywords, location);
    const items = response.tasks?.[0]?.result?.[0]?.items ?? [];

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Search volume error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch search volume",
      },
      { status: 500 }
    );
  }
}
