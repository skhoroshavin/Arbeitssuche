import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createWithUniqueId } from "./create-with-unique-id.js";

describe("createWithUniqueId", () => {
  it("returns the first non-existing id", () => {
    const id = createWithUniqueId(
      () => "abc",
      () => false,
    );
    assert.equal(id, "abc");
  });

  it("retries when id already exists", () => {
    const ids = ["taken", "taken", "free"];
    let i = 0;
    const existing = new Set(["taken"]);

    const id = createWithUniqueId(
      () => ids[i++],
      (id) => existing.has(id),
    );
    assert.equal(id, "free");
  });

  it("throws after 5 failed attempts", () => {
    assert.throws(
      () =>
        createWithUniqueId(
          () => "collision",
          () => true,
        ),
      { message: "Failed to generate unique id after 5 attempts" },
    );
  });
});
