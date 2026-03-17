import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseVersion,
  formatVersion,
  computeNextVersion,
  type ParsedVersion,
} from "./bump-version.ts";

describe("parseVersion", () => {
  it("parses a release version", () => {
    assert.deepStrictEqual(parseVersion("1.2.3"), {
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
    });
  });

  it("parses a dev version", () => {
    assert.deepStrictEqual(parseVersion("0.1.2-dev"), {
      major: 0,
      minor: 1,
      patch: 2,
      prerelease: "dev",
    });
  });

  it("throws on invalid version", () => {
    assert.throws(() => parseVersion("not-a-version"), /Invalid version/);
  });

  it("throws on version with unknown prerelease", () => {
    assert.throws(() => parseVersion("1.2.3-beta.1"), /Invalid version/);
  });

  it("throws on rc version", () => {
    assert.throws(() => parseVersion("1.3.0-rc.5"), /Invalid version/);
  });
});

describe("formatVersion", () => {
  it("formats a release version", () => {
    assert.equal(
      formatVersion({ major: 1, minor: 2, patch: 3, prerelease: null }),
      "1.2.3",
    );
  });

  it("formats a dev version", () => {
    assert.equal(
      formatVersion({ major: 0, minor: 1, patch: 2, prerelease: "dev" }),
      "0.1.2-dev",
    );
  });
});

describe("computeNextVersion", () => {
  const dev = (major: number, minor: number, patch: number): ParsedVersion => ({
    major,
    minor,
    patch,
    prerelease: "dev",
  });

  const rel = (major: number, minor: number, patch: number): ParsedVersion => ({
    major,
    minor,
    patch,
    prerelease: null,
  });

  describe("bump dev", () => {
    it("adds -dev suffix", () => {
      assert.deepStrictEqual(
        computeNextVersion(rel(1, 2, 3), "dev"),
        dev(1, 2, 3),
      );
    });

    it("throws if already dev", () => {
      assert.throws(
        () => computeNextVersion(dev(1, 2, 3), "dev"),
        /Already a dev version/,
      );
    });
  });

  describe("bump major", () => {
    it("bumps major, resets minor+patch", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "major"),
        rel(2, 0, 0),
      );
    });

    it("throws if not dev", () => {
      assert.throws(
        () => computeNextVersion(rel(1, 2, 3), "major"),
        /requires a -dev version/,
      );
    });
  });

  describe("bump minor", () => {
    it("bumps minor, resets patch", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "minor"),
        rel(1, 3, 0),
      );
    });

    it("throws if not dev", () => {
      assert.throws(
        () => computeNextVersion(rel(1, 2, 3), "minor"),
        /requires a -dev version/,
      );
    });
  });

  describe("bump patch", () => {
    it("bumps patch", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "patch"),
        rel(1, 2, 5),
      );
    });

    it("throws if not dev", () => {
      assert.throws(
        () => computeNextVersion(rel(1, 2, 3), "patch"),
        /requires a -dev version/,
      );
    });
  });
});
