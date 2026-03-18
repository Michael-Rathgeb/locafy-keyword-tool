import type {
  DataForSEOResponse,
  KeywordSuggestionsResult,
  KeywordSearchVolumeResult,
} from "@/types/keyword";

const API_BASE = "https://api.dataforseo.com/v3";

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error("DataForSEO credentials not configured");
  }
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

async function request<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status_code !== 20000) {
    throw new Error(`DataForSEO error: ${data.status_message}`);
  }

  return data;
}

export async function getKeywordSuggestions(
  keyword: string,
  locationName: string,
  languageCode: string = "en",
  limit: number = 50
): Promise<DataForSEOResponse<KeywordSuggestionsResult>> {
  return request("/dataforseo_labs/google/keyword_suggestions/live", [
    {
      keyword,
      location_name: locationName,
      language_code: languageCode,
      include_seed_keyword: true,
      limit,
      order_by: ["keyword_info.search_volume,desc"],
    },
  ]);
}

export async function getSearchVolume(
  keywords: string[],
  locationName: string,
  languageCode: string = "en"
): Promise<DataForSEOResponse<KeywordSearchVolumeResult>> {
  return request("/keywords_data/google_ads/search_volume/live", [
    {
      keywords,
      location_name: locationName,
      language_code: languageCode,
    },
  ]);
}

export async function getRelatedKeywords(
  keyword: string,
  locationName: string,
  languageCode: string = "en",
  limit: number = 50
): Promise<DataForSEOResponse<KeywordSuggestionsResult>> {
  return request("/dataforseo_labs/google/related_keywords/live", [
    {
      keyword,
      location_name: locationName,
      language_code: languageCode,
      limit,
      order_by: ["keyword_info.search_volume,desc"],
    },
  ]);
}
