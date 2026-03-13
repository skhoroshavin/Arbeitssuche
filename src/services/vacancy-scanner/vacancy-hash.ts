import { createHash } from "node:crypto";

function normalizeString(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function vacancyHash(
  title?: string,
  company?: string,
  address?: string,
  contactName?: string,
): string {
  const parts = [title, company, address, contactName].map(normalizeString);
  const key = parts.join("||");
  return createHash("md5").update(key).digest("hex").slice(0, 6);
}
