import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { str } from "./coerce.js";

describe("str", () => {
  it("returns the value when it is a string", () => {
    assert.equal(str("hello"), "hello");
  });

  it("returns undefined for non-string values", () => {
    assert.equal(str(42), undefined);
    assert.equal(str(null), undefined);
    assert.equal(str(undefined), undefined);
    assert.equal(str(true), undefined);
    assert.equal(str({}), undefined);
    assert.equal(str([]), undefined);
  });

  it("returns empty string as-is", () => {
    assert.equal(str(""), "");
  });
});
