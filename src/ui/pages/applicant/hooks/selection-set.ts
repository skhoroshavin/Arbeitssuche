import { useCallback, useMemo, useState } from "react";

export function useSelectionSet() {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const reset = useCallback(() => setSelected(new Set()), []);

  const setAll = useCallback((count: number) => {
    setSelected(new Set(Array.from({ length: count }, (_, index) => index)));
  }, []);

  const toggle = useCallback((index: number) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ selected, reset, setAll, toggle }),
    [selected, reset, setAll, toggle],
  );
}
