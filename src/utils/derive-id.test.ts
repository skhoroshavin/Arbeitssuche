import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deriveId } from "./derive-id.js";

describe("deriveId", () => {
  test("produces a slug with hex suffix", () => {
    const id = deriveId("Hello World");
    assert.match(id, /^hello_world_[0-9a-f]{4}$/);
  });

  test("strips diacritics", () => {
    const id = deriveId("Ünïcödé");
    assert.match(id, /^unicode_[0-9a-f]{4}$/);
  });

  test("replaces non-alphanumeric chars with underscores", () => {
    const id = deriveId("foo@bar.baz!");
    assert.match(id, /^foo_bar_baz_[0-9a-f]{4}$/);
  });

  test("truncates long slugs to 30 characters", () => {
    const long = "a".repeat(50);
    const id = deriveId(long);
    const slug = id.slice(0, id.lastIndexOf("_"));
    assert.ok(slug.length <= 30);
  });

  test("produces unique IDs for the same input", () => {
    const ids = new Set(Array.from({ length: 20 }, () => deriveId("same")));
    assert.ok(ids.size > 1);
  });

  test("handles empty string", () => {
    const id = deriveId("");
    assert.match(id, /^_[0-9a-f]{4}$/);
  });
});
