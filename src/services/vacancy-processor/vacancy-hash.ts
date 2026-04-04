import { createHash } from "node:crypto"

export function vacancyHash(
  title: string,
  company: string,
  address?: string,
  contactName?: string,
): string {
  const parts = [title, company, address, contactName].map((s) =>
    normalizeString(s),
  )
  const key = parts.join("||")
  return createHash("md5").update(key).digest("hex").slice(0, 6)
}

function normalizeString(s?: string): string {
  return (s ?? "").trim().toLowerCase()
}
