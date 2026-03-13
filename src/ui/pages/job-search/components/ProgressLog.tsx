import type { ProgressEvent } from "@/models/events.js";

export function ProgressLog({
  events,
  done,
  scrollable,
}: {
  events: ProgressEvent[];
  done?: boolean;
  scrollable?: boolean;
}) {
  return (
    <div
      className={`font-mono text-xs text-gray-600 dark:text-gray-400 space-y-1 ${scrollable ? "max-h-48 overflow-y-auto" : ""}`}
    >
      {events.map((e, i) => (
        <div key={i}>{e.message}</div>
      ))}
      {done && <div className="text-green-600">Fertig</div>}
    </div>
  );
}
