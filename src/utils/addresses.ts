export function mergeAddresses(
  existing: string[],
  extracted: string[],
): string[] {
  const merged = [...existing]
  const mergedLower = merged.map((a) => a.toLowerCase())

  for (const newAddr of extracted) {
    const newLower = newAddr.toLowerCase()

    const subsumesIndex = mergedLower.findIndex(
      (lower) => lower !== newLower && newLower.includes(lower),
    )

    if (subsumesIndex === -1) {
      const alreadyCovered = mergedLower.some(
        (lower) => lower === newLower || lower.includes(newLower),
      )
      if (!alreadyCovered) {
        merged.push(newAddr)
        mergedLower.push(newLower)
      }
    } else {
      merged[subsumesIndex] = newAddr
      mergedLower[subsumesIndex] = newLower
    }
  }

  return merged
}
