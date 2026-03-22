import { describe, it, expect } from "vitest";
import { str } from "./coerce";

describe("str", () => {
  it("returns the value when it is a string", () => {
    expect(str("hello")).toBe("hello");
  });

  it("returns undefined for non-string values", () => {
    expect(str(42)).toBe(undefined);
    expect(str(null)).toBe(undefined);
    expect(str(undefined)).toBe(undefined);
    expect(str(true)).toBe(undefined);
    expect(str({})).toBe(undefined);
    expect(str([])).toBe(undefined);
  });

  it("returns empty string as-is", () => {
    expect(str("")).toBe("");
  });
});
