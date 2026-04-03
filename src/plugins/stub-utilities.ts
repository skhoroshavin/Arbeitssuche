export function findStubMatch<T>(
  entries: Record<string, T>,
  value: string,
): T | undefined {
  if (value in entries) return entries[value]
  for (const [pattern, entry] of Object.entries(entries)) {
    if (value.includes(pattern)) return entry
  }
  return undefined
}
