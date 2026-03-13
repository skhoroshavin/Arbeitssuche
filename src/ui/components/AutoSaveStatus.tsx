import type { AutoSaveStatus as Status } from "@/ui/hooks/auto-save";

const config: Record<
  Exclude<Status, "idle">,
  { text: string; className: string }
> = {
  unsaved: {
    text: "Ungespeicherte Änderungen",
    className: "text-amber-600 dark:text-amber-400",
  },
  saving: {
    text: "Speichern...",
    className: "text-gray-500 dark:text-gray-400",
  },
  saved: {
    text: "Gespeichert",
    className: "text-green-600 dark:text-green-400",
  },
  error: {
    text: "Fehler beim Speichern",
    className: "text-red-600 dark:text-red-400",
  },
};

export function AutoSaveStatus({ status }: { status: Status }) {
  if (status === "idle") return null;
  const { text, className } = config[status];
  return <span className={`text-sm ${className}`}>{text}</span>;
}
