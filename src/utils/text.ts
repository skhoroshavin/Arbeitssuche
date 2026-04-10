export function normalizeMailtoHref(
  value: null | string | undefined,
): string | undefined {
  return normalizeOptionalText(value?.replace(/^mailto:/, ""))
}

export function joinNormalizedText(
  parts: Array<null | string | undefined>,
  separator = ", ",
): string | undefined {
  const normalizedParts = parts
    .map((part) => normalizeOptionalText(part))
    .filter((part): part is string => part !== undefined)
  if (normalizedParts.length === 0) return undefined
  return normalizedParts.join(separator)
}

export function normalizeContact(contact: {
  name?: null | string
  email?: null | string
  phone?: null | string
}): { name?: string; email?: string; phone?: string } | undefined {
  const normalizedContact = {
    name: normalizeOptionalText(contact.name),
    email: normalizeOptionalText(contact.email),
    phone: normalizeOptionalText(contact.phone),
  }
  if (Object.values(normalizedContact).every((value) => value === undefined)) {
    return undefined
  }
  return normalizedContact
}

export function normalizeOptionalText(
  value: null | string | undefined,
): string | undefined {
  const normalized = value?.trim()
  if (!normalized || normalized === "null") return undefined
  return normalized
}
