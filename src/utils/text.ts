export function normalizeMailtoHref(
  value: null | string | undefined,
): string | undefined {
  return normalizeOptionalText(value?.replace(/^mailto:/, ""))
}

export function normalizeOptionalText(
  value: null | string | undefined,
): string | undefined {
  const normalized = value?.trim()
  if (!normalized || normalized === "null") return undefined
  return normalized
}
