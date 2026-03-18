export interface MonthlySearch {
  year: number;
  month: number;
  search_volume: number;
}

export interface KeywordResult {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  keyword_difficulty: number | null;
  intent: string | null;
  trend: MonthlySearch[];
}

export interface KeywordSuggestionsRequest {
  keyword: string;
  location_name: string;
  language_code?: string;
  limit?: number;
}

export interface KeywordVolumeRequest {
  keywords: string[];
  location_name: string;
  language_code?: string;
}

export interface DataForSEOResponse<T> {
  status_code: number;
  status_message: string;
  tasks: Array<{
    status_code: number;
    status_message: string;
    result: T[] | null;
  }>;
}

export interface KeywordSuggestionsResult {
  seed_keyword: string;
  seed_keyword_data: DataForSEOKeywordItem | null;
  total_count: number;
  items_count: number;
  items: DataForSEOKeywordItem[];
}

export interface DataForSEOKeywordItem {
  keyword: string;
  keyword_info: {
    search_volume: number | null;
    cpc: number | null;
    competition: number | null;
    monthly_searches: MonthlySearch[] | null;
  } | null;
  keyword_properties: {
    keyword_difficulty: number | null;
  } | null;
  search_intent_info: {
    main_intent: string | null;
  } | null;
}

export interface KeywordSearchVolumeResult {
  items: Array<{
    keyword: string;
    search_volume: number | null;
    cpc: number | null;
    competition: number | null;
    monthly_searches: MonthlySearch[] | null;
  }>;
}
