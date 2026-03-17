import { useEffect, useRef, type RefObject } from "react";

export function useScrollRestoration(
  ref: RefObject<HTMLElement | null>,
  locationKey: string,
): void {
  const scrollPositions = useRef(new Map<string, number>());
  const previousKey = useRef(locationKey);
  const currentScrollTop = useRef(0);

  // Track scroll position continuously via passive listener
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      currentScrollTop.current = el.scrollTop;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref]);

  // Save previous position and restore on location change
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (previousKey.current !== locationKey) {
      scrollPositions.current.set(
        previousKey.current,
        currentScrollTop.current,
      );
      previousKey.current = locationKey;
    }

    const saved = scrollPositions.current.get(locationKey) ?? 0;
    el.scrollTop = saved;

    // If content isn't tall enough yet, retry with rAF polling
    let rafId: number | undefined;
    if (saved > 0 && el.scrollTop !== saved) {
      let frame = 0;
      const maxFrames = 30;

      const tryRestore = () => {
        el.scrollTop = saved;
        frame++;
        if (el.scrollTop !== saved && frame < maxFrames) {
          rafId = requestAnimationFrame(tryRestore);
        }
      };

      rafId = requestAnimationFrame(tryRestore);
    }

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, [locationKey, ref]);
}
