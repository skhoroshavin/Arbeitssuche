/** Coerce an unknown value to a string, returning `undefined` if not a string. */
export function str(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}
