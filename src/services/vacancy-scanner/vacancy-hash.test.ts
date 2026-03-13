import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { vacancyHash } from "./vacancy-hash.js";

describe("vacancyHash", () => {
  test("returns 6-char hex string", () => {
    const hash = vacancyHash("Developer", "ACME Corp", "Berlin", "John");
    assert.equal(hash.length, 6);
    assert.match(hash, /^[0-9a-f]{6}$/);
  });

  test("is deterministic", () => {
    const a = vacancyHash("Developer", "ACME Corp");
    const b = vacancyHash("Developer", "ACME Corp");
    assert.equal(a, b);
  });

  test("is case-insensitive", () => {
    const a = vacancyHash("developer", "acme corp");
    const b = vacancyHash("Developer", "ACME Corp");
    assert.equal(a, b);
  });

  test("handles undefined fields", () => {
    const hash = vacancyHash(undefined, undefined);
    assert.equal(hash.length, 6);
    assert.match(hash, /^[0-9a-f]{6}$/);
  });

  test("different inputs produce different hashes", () => {
    const a = vacancyHash("Developer", "ACME");
    const b = vacancyHash("Designer", "ACME");
    assert.notEqual(a, b);
  });
});
