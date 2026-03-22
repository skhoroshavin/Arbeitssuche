import { describe, it, expect } from "vitest";

import {
  parseVersion,
  formatVersion,
  computeNextVersion,
  type ParsedVersion,
} from "./bump-version.ts";

describe("parseVersion", () => {
  it("parses a release version", () => {
    expect(parseVersion("1.2.3")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
    });
  });

  it("parses a dev version", () => {
    expect(parseVersion("0.1.2-dev")).toEqual({
      major: 0,
      minor: 1,
      patch: 2,
      prerelease: "dev",
    });
  });

  it("throws on invalid version", () => {
    expect(() => parseVersion("not-a-version")).toThrow(/Invalid version/);
  });

  it("throws on version with unknown prerelease", () => {
    expect(() => parseVersion("1.2.3-beta.1")).toThrow(/Invalid version/);
  });

  it("throws on rc version", () => {
    expect(() => parseVersion("1.3.0-rc.5")).toThrow(/Invalid version/);
  });
});

describe("formatVersion", () => {
  it("formats a release version", () => {
    expect(
      formatVersion({ major: 1, minor: 2, patch: 3, prerelease: null }),
    ).toBe("1.2.3");
  });

  it("formats a dev version", () => {
    expect(
      formatVersion({ major: 0, minor: 1, patch: 2, prerelease: "dev" }),
    ).toBe("0.1.2-dev");
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
      expect(computeNextVersion(rel(1, 2, 3), "dev")).toEqual(dev(1, 2, 3));
    });

    it("throws if already dev", () => {
      expect(() => computeNextVersion(dev(1, 2, 3), "dev")).toThrow(
        /Already a dev version/,
      );
    });
  });

  describe("bump major", () => {
    it("bumps major, resets minor+patch", () => {
      expect(computeNextVersion(dev(1, 2, 4), "major")).toEqual(rel(2, 0, 0));
    });

    it("throws if not dev", () => {
      expect(() => computeNextVersion(rel(1, 2, 3), "major")).toThrow(
        /requires a -dev version/,
      );
    });
  });

  describe("bump minor", () => {
    it("bumps minor, resets patch", () => {
      expect(computeNextVersion(dev(1, 2, 4), "minor")).toEqual(rel(1, 3, 0));
    });

    it("throws if not dev", () => {
      expect(() => computeNextVersion(rel(1, 2, 3), "minor")).toThrow(
        /requires a -dev version/,
      );
    });
  });

  describe("bump patch", () => {
    it("bumps patch", () => {
      expect(computeNextVersion(dev(1, 2, 4), "patch")).toEqual(rel(1, 2, 5));
    });

    it("throws if not dev", () => {
      expect(() => computeNextVersion(rel(1, 2, 3), "patch")).toThrow(
        /requires a -dev version/,
      );
    });
  });
});
