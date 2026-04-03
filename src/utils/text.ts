export function normalizeMailtoHref(
  value: null | string | undefined,
): string | undefined {
  return normalizeOptionalText(value?.replace(/^mailto:/, ""))
}

export function formatAddressParts(
  parts: Array<null | string | undefined>,
  separator = ", ",
): string | undefined {
  const normalizedParts = parts
    .map((part) => normalizeOptionalText(part))
    .filter((part): part is string => part !== undefined)
  if (normalizedParts.length === 0) return undefined
  return normalizedParts.join(separator)
}

export function normalizeOptionalText(
  value: null | string | undefined,
): string | undefined {
  const normalized = value?.trim()
  if (!normalized || normalized === "null") return undefined
  return normalized
}
