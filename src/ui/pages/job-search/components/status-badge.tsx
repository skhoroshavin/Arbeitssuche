import { STATUS_COLORS } from "@/models/vacancy/index";
import type { VacancyStatus } from "@/models/vacancy/types";

export function StatusBadge({
  status,
  size = "sm",
  children,
}: {
  status: VacancyStatus;
  size?: "sm" | "md";
  children?: React.ReactNode;
}) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  const colorClass = STATUS_COLORS[status];
  return (
    <span className={`rounded-full font-medium ${sizeClass} ${colorClass}`}>
      {children ?? status}
    </span>
  );
}
