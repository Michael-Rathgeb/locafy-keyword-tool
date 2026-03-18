import type { MonthlySearch } from "@/types/keyword";

interface TrendChartProps {
  data: MonthlySearch[];
}

export default function TrendChart({ data }: TrendChartProps) {
  if (!data.length) {
    return <div className="w-20 h-8 bg-gray-50 rounded" />;
  }

  const sorted = [...data].sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  );

  const values = sorted.map((d) => d.search_volume);
  const max = Math.max(...values, 1);
  const width = 80;
  const height = 32;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (v / max) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isGrowing =
    values.length >= 2 && values[values.length - 1] > values[0];

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={isGrowing ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}
