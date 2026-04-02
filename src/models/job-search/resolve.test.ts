import { describe, expect, it } from "vitest";
import { resolveJobSearch } from "./index";

describe("resolveJobSearch", () => {
  it("fills missing params and preferences defaults", () => {
    expect(
      resolveJobSearch({
        id: "js1",
        applicantId: "app1",
        params: { searchTerm: "React" },
      }),
    ).toEqual({
      id: "js1",
      applicantId: "app1",
      params: {
        searchTerm: "React",
        radiusKm: 30,
        searchMode: "employment",
        sources: [],
      },
      preferences: { freeText: [] },
    });
  });
});
