import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "@/ui/components";

export function Disclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ChevronRightIcon
          className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {title}
      </button>
      {open && (
        <div className="mt-2 pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}
