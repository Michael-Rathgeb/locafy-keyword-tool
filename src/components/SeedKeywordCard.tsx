import type { KeywordResult } from "@/types/keyword";
import DifficultyBadge from "./DifficultyBadge";
import TrendChart from "./TrendChart";

interface SeedKeywordCardProps {
  seed: KeywordResult;
}

function formatNumber(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

export default function SeedKeywordCard({ seed }: SeedKeywordCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Seed Keyword
          </p>
          <h2 className="text-xl font-bold text-gray-900">{seed.keyword}</h2>
        </div>
        <TrendChart data={seed.trend} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Search Volume</p>
          <p className="text-lg font-bold text-gray-900">
            {formatNumber(seed.search_volume)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Difficulty</p>
          <DifficultyBadge difficulty={seed.keyword_difficulty} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">CPC</p>
          <p className="text-lg font-bold text-gray-900">
            {seed.cpc !== null ? `$${seed.cpc.toFixed(2)}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Competition</p>
          <p className="text-lg font-bold text-gray-900">
            {seed.competition !== null
              ? `${(seed.competition * 100).toFixed(0)}%`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
