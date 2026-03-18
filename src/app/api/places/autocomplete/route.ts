import { NextRequest, NextResponse } from "next/server";
import { getPlaceAutocomplete } from "@/lib/google-maps";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const predictions = await getPlaceAutocomplete(input);
    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch suggestions",
      },
      { status: 500 }
    );
  }
}
