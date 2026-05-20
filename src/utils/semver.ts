export function semverGreaterThan(a: string, b: string): boolean {
  const [aMajor, aMinor, aPatch] = a.split(".").map(Number)
  const [bMajor, bMinor, bPatch] = b.split(".").map(Number)
  if (aMajor !== bMajor) return aMajor > bMajor
  if (aMinor !== bMinor) return aMinor > bMinor
  return aPatch > bPatch
}
