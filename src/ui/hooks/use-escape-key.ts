import { useEffect, useCallback } from "react";

/** Calls `callback` when the Escape key is pressed. */
export function useEscapeKey(callback: () => void): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") callback();
    },
    [callback],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
