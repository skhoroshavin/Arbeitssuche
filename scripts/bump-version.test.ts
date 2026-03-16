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

  it("parses an rc version", () => {
    assert.deepStrictEqual(parseVersion("1.3.0-rc.5"), {
      major: 1,
      minor: 3,
      patch: 0,
      prerelease: { rc: 5 },
    });
  });

  it("throws on invalid version", () => {
    assert.throws(() => parseVersion("not-a-version"), /Invalid version/);
  });

  it("throws on version with unknown prerelease", () => {
    assert.throws(() => parseVersion("1.2.3-beta.1"), /Invalid version/);
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

  it("formats an rc version", () => {
    assert.equal(
      formatVersion({ major: 1, minor: 3, patch: 0, prerelease: { rc: 0 } }),
      "1.3.0-rc.0",
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

  const rc = (
    major: number,
    minor: number,
    patch: number,
    n: number,
  ): ParsedVersion => ({
    major,
    minor,
    patch,
    prerelease: { rc: n },
  });

  const rel = (major: number, minor: number, patch: number): ParsedVersion => ({
    major,
    minor,
    patch,
    prerelease: null,
  });

  describe("no args (auto-detect)", () => {
    it("dev → strips dev, bumps patch → release", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), null, false),
        rel(1, 2, 5),
      );
    });

    it("rc → increments rc number", () => {
      assert.deepStrictEqual(
        computeNextVersion(rc(1, 3, 0, 0), null, false),
        rc(1, 3, 0, 1),
      );
    });

    it("release version → throws", () => {
      assert.throws(
        () => computeNextVersion(rel(1, 2, 3), null, false),
        /Cannot auto-detect/,
      );
    });
  });

  describe("bump dev", () => {
    it("adds -dev suffix", () => {
      assert.deepStrictEqual(
        computeNextVersion(rel(1, 2, 3), "dev", false),
        dev(1, 2, 3),
      );
    });

    it("throws if already dev", () => {
      assert.throws(
        () => computeNextVersion(dev(1, 2, 3), "dev", false),
        /Already a dev version/,
      );
    });
  });

  describe("bump major", () => {
    it("bumps major, resets minor+patch", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "major", false),
        rel(2, 0, 0),
      );
    });

    it("with rc flag → adds -rc.0", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "major", true),
        rc(2, 0, 0, 0),
      );
    });

    it("throws if not dev", () => {
      assert.throws(
        () => computeNextVersion(rel(1, 2, 3), "major", false),
        /requires a -dev version/,
      );
    });
  });

  describe("bump minor", () => {
    it("bumps minor, resets patch", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "minor", false),
        rel(1, 3, 0),
      );
    });

    it("with rc flag → adds -rc.0", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "minor", true),
        rc(1, 3, 0, 0),
      );
    });

    it("throws if not dev", () => {
      assert.throws(
        () => computeNextVersion(rc(1, 3, 0, 1), "minor", false),
        /requires a -dev version/,
      );
    });
  });

  describe("bump patch", () => {
    it("bumps patch", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "patch", false),
        rel(1, 2, 5),
      );
    });

    it("with rc flag → adds -rc.0", () => {
      assert.deepStrictEqual(
        computeNextVersion(dev(1, 2, 4), "patch", true),
        rc(1, 2, 5, 0),
      );
    });
  });

  describe("bump release", () => {
    it("strips -rc.N", () => {
      assert.deepStrictEqual(
        computeNextVersion(rc(1, 3, 0, 2), "release", false),
        rel(1, 3, 0),
      );
    });

    it("throws if not rc", () => {
      assert.throws(
        () => computeNextVersion(dev(1, 2, 3), "release", false),
        /requires an -rc.N version/,
      );
    });

    it("throws if release version", () => {
      assert.throws(
        () => computeNextVersion(rel(1, 2, 3), "release", false),
        /requires an -rc.N version/,
      );
    });
  });
});
