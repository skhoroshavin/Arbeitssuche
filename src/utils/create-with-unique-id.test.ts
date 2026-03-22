import { describe, it, expect } from "vitest";
import { createWithUniqueId } from "./create-with-unique-id";

describe("createWithUniqueId", () => {
  it("returns the first non-existing id", () => {
    const id = createWithUniqueId(
      () => "abc",
      () => false,
    );
    expect(id).toBe("abc");
  });

  it("retries when id already exists", () => {
    const ids = ["taken", "taken", "free"];
    let i = 0;
    const existing = new Set(["taken"]);

    const id = createWithUniqueId(
      () => ids[i++],
      (id) => existing.has(id),
    );
    expect(id).toBe("free");
  });

  it("throws after 5 failed attempts", () => {
    expect(() =>
      createWithUniqueId(
        () => "collision",
        () => true,
      ),
    ).toThrow("Failed to generate unique id after 5 attempts");
  });
});
