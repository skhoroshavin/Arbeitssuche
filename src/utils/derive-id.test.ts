import { test, describe, expect } from "vitest";
import { deriveId } from "./derive-id";

describe("deriveId", () => {
  test("produces a slug with hex suffix", () => {
    const id = deriveId("Hello World");
    expect(id).toMatch(/^hello_world_[0-9a-f]{4}$/);
  });

  test("strips diacritics", () => {
    const id = deriveId("Ünïcödé");
    expect(id).toMatch(/^unicode_[0-9a-f]{4}$/);
  });

  test("replaces non-alphanumeric chars with underscores", () => {
    const id = deriveId("foo@bar.baz!");
    expect(id).toMatch(/^foo_bar_baz_[0-9a-f]{4}$/);
  });

  test("truncates long slugs to 30 characters", () => {
    const long = "a".repeat(50);
    const id = deriveId(long);
    const slug = id.slice(0, id.lastIndexOf("_"));
    expect(slug.length <= 30).toBeTruthy();
  });

  test("produces unique IDs for the same input", () => {
    const ids = new Set(Array.from({ length: 20 }, () => deriveId("same")));
    expect(ids.size > 1).toBeTruthy();
  });

  test("handles empty string", () => {
    const id = deriveId("");
    expect(id).toMatch(/^_[0-9a-f]{4}$/);
  });
});
