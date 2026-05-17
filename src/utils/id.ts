import { randomBytes } from "node:crypto"

/** Generate a unique ID derived from the same base text on each retry. */
export function createUniqueDerivedId(
  text: string,
  exists: (id: string) => boolean,
): string {
  return createWithUniqueId(() => deriveId(text), exists)
}

/**
 * Retry loop for creating an entity with a unique derived ID.
 * Calls `derive()` up to 5 times, returning the first ID where `exists()` is false.
 * Throws if all 5 attempts collide.
 * @internal Exported for testing only.
 */
function createWithUniqueId(
  derive: () => string,
  exists: (id: string) => boolean,
): string {
  for (let index = 0; index < 5; index++) {
    const id = derive()
    if (!exists(id)) return id
  }
  throw new Error("Failed to generate unique id after 5 attempts")
}

/**
 * Derive a URL-safe ID from text: slugified prefix (max 30 chars) + 4-char random hex suffix.
 * @internal Exported for testing only.
 */
function deriveId(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .slice(0, 30)
  const suffix = randomBytes(2).toString("hex")
  return `${slug}_${suffix}`
}
