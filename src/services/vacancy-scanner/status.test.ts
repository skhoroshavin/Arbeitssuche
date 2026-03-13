import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveStatus } from "./status.js";
import type { Vacancy } from "@/models/vacancy/types.js";

function makeVacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return {
    hash: "abc123",
    title: "Test",
    company: "Test Co",
    urls: [],
    addresses: [],
    descriptionChanged: false,
    activityHistory: [],
    active: true,
    ...overrides,
  };
}

describe("deriveStatus", () => {
  it("returns 'new' for active vacancy with no history", () => {
    assert.equal(deriveStatus(makeVacancy()), "new");
  });

  it("returns 'gone' for inactive vacancy with no user activities", () => {
    assert.equal(deriveStatus(makeVacancy({ active: false })), "gone");
  });

  it("returns 'renewed' for active vacancy that was previously not-found", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [
            { type: "found", date: "2025-01-01", site: "s", url: "u" },
            { type: "not-found", date: "2025-01-02", site: "s" },
            { type: "found", date: "2025-01-03", site: "s", url: "u" },
          ],
        }),
      ),
      "renewed",
    );
  });

  it("returns 'applied' for active vacancy with applied activity", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [{ type: "applied", date: "2025-01-01" }],
        }),
      ),
      "applied",
    );
  });

  it("returns 'ignored' for inactive vacancy with applied activity", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          active: false,
          activityHistory: [{ type: "applied", date: "2025-01-01" }],
        }),
      ),
      "ignored",
    );
  });

  it("returns 'invited' when invited activity exists", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [
            { type: "applied", date: "2025-01-01" },
            {
              type: "invited",
              date: "2025-01-02",
              interviewDate: "2025-01-10",
            },
          ],
        }),
      ),
      "invited",
    );
  });

  it("returns 'interviewed' when interviewed activity exists", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [
            { type: "applied", date: "2025-01-01" },
            { type: "interviewed", date: "2025-01-05", outcome: "completed" },
          ],
        }),
      ),
      "interviewed",
    );
  });

  it("returns 'offered' when offered activity exists", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [{ type: "offered", date: "2025-01-01" }],
        }),
      ),
      "offered",
    );
  });

  it("returns 'rejected' when rejected activity exists (highest priority)", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [
            { type: "applied", date: "2025-01-01" },
            { type: "offered", date: "2025-01-02" },
            { type: "rejected", date: "2025-01-03" },
          ],
        }),
      ),
      "rejected",
    );
  });

  it("returns 'not-interested' when not-interested activity exists", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [{ type: "not-interested", date: "2025-01-01" }],
        }),
      ),
      "not-interested",
    );
  });

  it("returns 'applied' over 'not-interested' when both exist", () => {
    assert.equal(
      deriveStatus(
        makeVacancy({
          activityHistory: [
            { type: "not-interested", date: "2025-01-01" },
            { type: "applied", date: "2025-01-02" },
          ],
        }),
      ),
      "applied",
    );
  });
});
