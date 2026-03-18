interface IntentBadgeProps {
  intent: string | null;
}

const intentConfig: Record<
  string,
  { bgColor: string; textColor: string; icon: string }
> = {
  informational: {
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    icon: "ℹ️",
  },
  navigational: {
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    icon: "🧭",
  },
  commercial: {
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
    icon: "🔍",
  },
  transactional: {
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    icon: "💰",
  },
};

export default function IntentBadge({ intent }: IntentBadgeProps) {
  if (!intent) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        —
      </span>
    );
  }

  const config = intentConfig[intent] ?? {
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    icon: "📋",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      <span>{config.icon}</span>
      <span className="capitalize">{intent}</span>
    </span>
  );
}
