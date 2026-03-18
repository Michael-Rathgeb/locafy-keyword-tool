interface DifficultyBadgeProps {
  difficulty: number | null;
}

function getConfig(difficulty: number): {
  label: string;
  bgColor: string;
  textColor: string;
} {
  if (difficulty <= 25)
    return {
      label: "Easy",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    };
  if (difficulty <= 50)
    return {
      label: "Medium",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    };
  if (difficulty <= 75)
    return {
      label: "Hard",
      bgColor: "bg-orange-100",
      textColor: "text-orange-800",
    };
  return {
    label: "Very Hard",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
  };
}

export default function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  if (difficulty === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }

  const { label, bgColor, textColor } = getConfig(difficulty);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bgColor} ${textColor}`}
    >
      <span>{Math.round(difficulty)}</span>
      <span className="opacity-70">·</span>
      <span>{label}</span>
    </span>
  );
}
