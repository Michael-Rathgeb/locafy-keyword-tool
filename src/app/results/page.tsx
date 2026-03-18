"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SearchForm from "@/components/SearchForm";
import KeywordTable from "@/components/KeywordTable";
import SeedKeywordCard from "@/components/SeedKeywordCard";
import type { KeywordResult } from "@/types/keyword";

interface SearchResponse {
  seed: KeywordResult | null;
  keywords: KeywordResult[];
  total: number;
  error?: string;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") ?? "";
  const location = searchParams.get("location") ?? "";

  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = useCallback(async () => {
    if (!keyword || !location) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        keyword,
        location,
        limit: "100",
      });

      const res = await fetch(`/api/keywords/suggestions?${params}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to fetch keywords");
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [keyword, location]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="shrink-0"
            >
              <Image
                src="https://locafy.com/_astro/LocafyDark.DAFw3kIA.png"
                alt="Locafy"
                width={120}
                height={32}
              />
            </Link>
            <div className="flex-1">
              <SearchForm
                initialKeyword={keyword}
                initialLocation={location}
                compact
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && !keyword && (
          <div className="text-center py-20">
            <p className="text-gray-500">
              Enter a keyword and location above to get started.
            </p>
          </div>
        )}

        {(isLoading || data) && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Keywords for &ldquo;{keyword}&rdquo;
                </h1>
                <p className="text-sm text-gray-500">{location}</p>
              </div>
              {data && !isLoading && (
                <p className="text-sm text-gray-500">
                  {data.total} keywords found
                </p>
              )}
            </div>

            {data?.seed && !isLoading && (
              <SeedKeywordCard seed={data.seed} />
            )}

            <KeywordTable
              keywords={data?.keywords ?? []}
              isLoading={isLoading}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
