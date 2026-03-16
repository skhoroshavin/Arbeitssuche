import { useEffect, useRef, type RefObject } from "react";

export function useScrollRestoration(
  ref: RefObject<HTMLElement | null>,
  locationKey: string,
): void {
  const scrollPositions = useRef(new Map<string, number>());
  const previousKey = useRef(locationKey);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Save scroll position for the previous location
    if (previousKey.current !== locationKey) {
      scrollPositions.current.set(previousKey.current, el.scrollTop);
      previousKey.current = locationKey;
    }

    // Restore scroll position for the new location (or scroll to top)
    const saved = scrollPositions.current.get(locationKey);
    el.scrollTop = saved ?? 0;
  }, [locationKey, ref]);
}
