import { STATUS_COLORS } from "@/ui/constants";

const DEFAULT_COLOR =
  "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";

export function StatusBadge({
  status,
  size = "sm",
  children,
}: {
  status: string;
  size?: "sm" | "md";
  children?: React.ReactNode;
}) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  const colorClass = STATUS_COLORS[status] ?? DEFAULT_COLOR;
  return (
    <span className={`rounded-full font-medium ${sizeClass} ${colorClass}`}>
      {children ?? status}
    </span>
  );
}
