/**
 * Retry loop for creating an entity with a unique derived ID.
 * Calls `derive()` up to 5 times, returning the first ID where `exists()` is false.
 * Throws if all 5 attempts collide.
 */
export function createWithUniqueId(
  derive: () => string,
  exists: (id: string) => boolean,
): string {
  for (let i = 0; i < 5; i++) {
    const id = derive();
    if (!exists(id)) return id;
  }
  throw new Error("Failed to generate unique id after 5 attempts");
}
