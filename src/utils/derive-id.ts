import { randomBytes } from "node:crypto";

export function deriveId(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  const suffix = randomBytes(2).toString("hex");
  return `${slug}_${suffix}`;
}
