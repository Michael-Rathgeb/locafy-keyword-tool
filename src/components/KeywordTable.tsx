"use client";

import { useState, useMemo } from "react";
import type { KeywordResult } from "@/types/keyword";
import DifficultyBadge from "./DifficultyBadge";
import IntentBadge from "./IntentBadge";
import TrendChart from "./TrendChart";

type SortField =
  | "keyword"
  | "search_volume"
  | "keyword_difficulty"
  | "cpc"
  | "competition";
type SortDirection = "asc" | "desc";

interface KeywordTableProps {
  keywords: KeywordResult[];
  isLoading?: boolean;
}

function formatVolume(volume: number | null): string {
  if (volume === null) return "—";
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toString();
}

function formatCpc(cpc: number | null): string {
  if (cpc === null) return "—";
  return `$${cpc.toFixed(2)}`;
}

function formatCompetition(competition: number | null): string {
  if (competition === null) return "—";
  return `${(competition * 100).toFixed(0)}%`;
}

export default function KeywordTable({
  keywords,
  isLoading = false,
}: KeywordTableProps) {
  const [sortField, setSortField] = useState<SortField>("search_volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    let items = keywords;
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter((k) => k.keyword.toLowerCase().includes(q));
    }
    return items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDirection === "desc" ? -cmp : cmp;
    });
  }, [keywords, sortField, sortDirection, filter]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <span className="text-gray-300 ml-1">↕</span>;
    return (
      <span className="text-blue-600 ml-1">
        {sortDirection === "desc" ? "↓" : "↑"}
      </span>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Fetching keyword data...</p>
        </div>
      </div>
    );
  }

  if (!keywords.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          No keywords found. Try a different search term or location.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter keywords..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-sm text-gray-500">
            {filtered.length} keyword{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => toggleSort("keyword")}
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center hover:text-gray-900"
                >
                  Keyword
                  <SortIcon field="keyword" />
                </button>
              </th>
              <th className="text-right px-4 py-3">
                <button
                  onClick={() => toggleSort("search_volume")}
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center justify-end hover:text-gray-900"
                >
                  Volume
                  <SortIcon field="search_volume" />
                </button>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trend
                </span>
              </th>
              <th className="text-center px-4 py-3">
                <button
                  onClick={() => toggleSort("keyword_difficulty")}
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center justify-center hover:text-gray-900"
                >
                  Difficulty
                  <SortIcon field="keyword_difficulty" />
                </button>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Intent
                </span>
              </th>
              <th className="text-right px-4 py-3">
                <button
                  onClick={() => toggleSort("cpc")}
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center justify-end hover:text-gray-900"
                >
                  CPC
                  <SortIcon field="cpc" />
                </button>
              </th>
              <th className="text-right px-4 py-3">
                <button
                  onClick={() => toggleSort("competition")}
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center justify-end hover:text-gray-900"
                >
                  Competition
                  <SortIcon field="competition" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((kw, index) => (
              <tr
                key={`${kw.keyword}-${index}`}
                className="hover:bg-blue-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">
                    {kw.keyword}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatVolume(kw.search_volume)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <TrendChart data={kw.trend} />
                </td>
                <td className="px-4 py-3 text-center">
                  <DifficultyBadge difficulty={kw.keyword_difficulty} />
                </td>
                <td className="px-4 py-3 text-center">
                  <IntentBadge intent={kw.intent} />
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-600">
                    {formatCpc(kw.cpc)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-600">
                    {formatCompetition(kw.competition)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
