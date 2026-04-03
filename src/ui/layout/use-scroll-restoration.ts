import { useEffect, useRef, type RefObject } from "react"

export function useScrollRestoration(
  reference: RefObject<HTMLElement | null>,
  locationKey: string,
): void {
  const scrollPositions = useRef(new Map<string, number>())
  const previousKey = useRef(locationKey)
  const currentScrollTop = useRef(0)

  // Track scroll position continuously via passive listener
  useEffect(() => {
    const element = reference.current
    if (!element) return

    const onScroll = () => {
      currentScrollTop.current = element.scrollTop
    }

    element.addEventListener("scroll", onScroll, { passive: true })
    return () => element.removeEventListener("scroll", onScroll)
  }, [reference])

  // Save previous position and restore on location change
  useEffect(() => {
    const element = reference.current
    if (!element) return

    if (previousKey.current !== locationKey) {
      scrollPositions.current.set(previousKey.current, currentScrollTop.current)
      previousKey.current = locationKey
    }

    const saved = scrollPositions.current.get(locationKey) ?? 0
    element.scrollTop = saved

    // If content isn't tall enough yet, retry with rAF polling
    let rafId: number | undefined
    if (saved > 0 && element.scrollTop !== saved) {
      let frame = 0
      const maxFrames = 30

      const tryRestore = () => {
        element.scrollTop = saved
        frame++
        if (element.scrollTop !== saved && frame < maxFrames) {
          rafId = requestAnimationFrame(tryRestore)
        }
      }

      rafId = requestAnimationFrame(tryRestore)
    }

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [locationKey, reference])
}
