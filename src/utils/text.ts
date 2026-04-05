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

export function arrayToString(array: string[] | undefined): string | undefined {
  return Array.isArray(array) ? array.join("\n") : array
}

export function stringToArray(
  value: string | string[] | undefined,
): string[] | undefined {
  return typeof value === "string"
    ? value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : value
}
