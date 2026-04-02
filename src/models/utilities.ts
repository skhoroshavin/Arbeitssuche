/**
 * Model-level utilities for common transformations.
 * These utilities are specifically designed for model data transformations.
 */

export function arrayToString(array: string[] | undefined): string | undefined {
  return Array.isArray(array) ? array.join("\n") : array;
}

export function stringToArray(
  value: string | string[] | undefined,
): string[] | undefined {
  return typeof value === "string"
    ? value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : value;
}
