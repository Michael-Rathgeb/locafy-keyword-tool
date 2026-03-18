import { NextRequest, NextResponse } from "next/server";
import { getKeywordSuggestions, getRelatedKeywords } from "@/lib/dataforseo";
import { extractCountryForDataForSEO } from "@/lib/locations";
import type { KeywordResult, DataForSEOKeywordItem } from "@/types/keyword";

function mapItem(item: DataForSEOKeywordItem): KeywordResult {
  return {
    keyword: item.keyword,
    search_volume: item.keyword_info?.search_volume ?? null,
    cpc: item.keyword_info?.cpc ?? null,
    competition: item.keyword_info?.competition ?? null,
    keyword_difficulty: item.keyword_properties?.keyword_difficulty ?? null,
    intent: item.search_intent_info?.main_intent ?? null,
    trend: item.keyword_info?.monthly_searches ?? [],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");
  const location = searchParams.get("location");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  if (!keyword || !location) {
    return NextResponse.json(
      { error: "keyword and location are required" },
      { status: 400 }
    );
  }

  try {
    const dataForSEOLocation = extractCountryForDataForSEO(location);

    const [suggestionsRes, relatedRes] = await Promise.all([
      getKeywordSuggestions(keyword, dataForSEOLocation, "en", limit),
      getRelatedKeywords(keyword, dataForSEOLocation, "en", limit),
    ]);

    const suggestionsItems =
      suggestionsRes.tasks?.[0]?.result?.[0]?.items ?? [];
    const relatedItems = relatedRes.tasks?.[0]?.result?.[0]?.items ?? [];

    const seen = new Set<string>();
    const results: KeywordResult[] = [];

    for (const item of [...suggestionsItems, ...relatedItems]) {
      const kw = item.keyword.toLowerCase();
      if (!seen.has(kw)) {
        seen.add(kw);
        results.push(mapItem(item));
      }
    }

    results.sort(
      (a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0)
    );

    const seedData = suggestionsRes.tasks?.[0]?.result?.[0]?.seed_keyword_data;

    return NextResponse.json({
      seed: seedData ? mapItem(seedData) : null,
      keywords: results,
      total: results.length,
    });
  } catch (error) {
    console.error("Keyword suggestions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch keywords",
      },
      { status: 500 }
    );
  }
}
