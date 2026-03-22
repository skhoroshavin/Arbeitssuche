import { test, describe, expect } from "vitest";
import { createArbeitsagenturSite } from "./index";
import { createStubBrowser } from "@/plugins/browser/stub/index";
import { createStubFetch } from "@/plugins/fetch/stub/index";
import type { SearchCriteria } from "@/plugins/job-site/types";

const SEARCH_URL_PATTERN = "/pc/v4/jobs";
const DETAILS_URL_PATTERN = "/pc/v3/jobdetails/";

function searchResponse(
  overrides: {
    stellenangebote?: Array<{ refnr: string }>;
    maxErgebnisse?: number;
    page?: number;
    size?: number;
  } = {},
) {
  return {
    stellenangebote: overrides.stellenangebote ?? [],
    maxErgebnisse: overrides.maxErgebnisse ?? 0,
    page: overrides.page ?? 1,
    size: overrides.size ?? 25,
  };
}

function createSite(
  routes: Record<string, { body: unknown; status?: number }>,
) {
  const stubFetch = createStubFetch(routes);
  const site = createArbeitsagenturSite(createStubBrowser({}), stubFetch);
  return { site, stubFetch };
}

const baseCriteria: SearchCriteria = {
  location: "Berlin",
  query: "Software",
  mode: "employment",
};

describe("arbeitsagentur", () => {
  describe("getVacancyList URL building", () => {
    test("includes query, location, and defaults", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList(baseCriteria);

      const url = stubFetch.requestedUrls[0];
      expect(url.includes("was=Software")).toBeTruthy();
      expect(url.includes("wo=Berlin")).toBeTruthy();
      expect(url.includes("angebotsart=1")).toBeTruthy();
      expect(url.includes("umkreis=25")).toBeTruthy();
      expect(url.includes("page=1")).toBeTruthy();
      expect(url.includes("size=25")).toBeTruthy();
    });

    test("omits was param when query is empty", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList({ ...baseCriteria, query: "" });

      expect(!stubFetch.requestedUrls[0].includes("was=")).toBeTruthy();
    });

    test("sets angebotsart=4 for apprenticeship", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList({
        location: "München",
        query: "",
        mode: "apprenticeship",
      });

      const url = stubFetch.requestedUrls[0];
      expect(url.includes("angebotsart=4")).toBeTruthy();
      expect(!url.includes("berufserfahrung")).toBeTruthy();
    });

    test("sets berufserfahrung=BEL for entry-level", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList({
        location: "Hamburg",
        query: "",
        mode: "entry-level",
      });

      const url = stubFetch.requestedUrls[0];
      expect(url.includes("angebotsart=1")).toBeTruthy();
      expect(url.includes("berufserfahrung=BEL")).toBeTruthy();
    });

    test("uses custom radiusKm", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList({ ...baseCriteria, radiusKm: 50 });

      expect(stubFetch.requestedUrls[0].includes("umkreis=50")).toBeTruthy();
    });

    test("uses pageId for pagination", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList(baseCriteria, "3");

      expect(stubFetch.requestedUrls[0].includes("page=3")).toBeTruthy();
    });
  });

  describe("getVacancyList response mapping", () => {
    test("maps search results to URLs with plain refnr", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: searchResponse({
            stellenangebote: [{ refnr: "10000-111" }, { refnr: "10000-222" }],
            maxErgebnisse: 100,
          }),
        },
      });
      const result = await site.getVacancyList(baseCriteria);

      expect(result.urls.length).toBe(2);
      expect(result.urls[0].endsWith("/jobdetail/10000-111")).toBeTruthy();
      expect(result.urls[1].endsWith("/jobdetail/10000-222")).toBeTruthy();
      expect(result.nextPageId).toBe("2");
    });

    test("returns no nextPageId on last page", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: searchResponse({
            stellenangebote: [{ refnr: "ref" }],
            maxErgebnisse: 2,
          }),
        },
      });
      const result = await site.getVacancyList(baseCriteria);

      expect(result.nextPageId).toBe(undefined);
    });

    test("handles empty results", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      const result = await site.getVacancyList(baseCriteria);

      expect(result.urls).toEqual([]);
      expect(result.nextPageId).toBe(undefined);
    });

    test("handles missing stellenangebote", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: { maxErgebnisse: 0, page: 1, size: 25 },
        },
      });
      const result = await site.getVacancyList(baseCriteria);

      expect(result.urls).toEqual([]);
      expect(result.nextPageId).toBe(undefined);
    });
  });

  describe("getVacancyDetails", () => {
    test("maps all fields from API response", async () => {
      const { site } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: {
            stellenangebotsTitel: "Software Engineer",
            stellenangebotsBeschreibung: "Great job description",
            firma: "Test GmbH",
            stellenlokationen: [
              {
                adresse: {
                  strasse: "Hauptstr. 1",
                  plz: "10115",
                  ort: "Berlin",
                },
              },
            ],
            eintrittszeitraum: { von: "2026-04-01" },
            veroeffentlichungszeitraum: { von: "2026-03-15" },
            referenznummer: "10000-111",
          },
        },
      });

      const vacancyUrl =
        "https://www.arbeitsagentur.de/jobsuche/jobdetail/abc123";
      const details = await site.getVacancyDetails(vacancyUrl);

      expect(details.title).toBe("Software Engineer");
      expect(details.company).toBe("Test GmbH");
      expect(details.address).toBe("Hauptstr. 1, 10115 Berlin");
      expect(details.descriptionHtml).toBe("Great job description");
      expect(details.startDate).toBe("2026-04-01");
      expect(details.publishedAt).toBe("2026-03-15");
      expect(details.contact).toBe(undefined);
    });

    test("handles missing address fields", async () => {
      const { site } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: { stellenangebotsTitel: "Dev" },
        },
      });

      const details = await site.getVacancyDetails(
        "https://www.arbeitsagentur.de/jobsuche/jobdetail/abc123",
      );

      expect(details.address).toBe(undefined);
    });

    test("filters out null string values in address", async () => {
      const { site } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: {
            stellenangebotsTitel: "Dev",
            stellenlokationen: [
              { adresse: { strasse: "null", plz: "10115", ort: "Berlin" } },
            ],
          },
        },
      });

      const details = await site.getVacancyDetails(
        "https://www.arbeitsagentur.de/jobsuche/jobdetail/abc123",
      );

      expect(details.address).toBe("10115 Berlin");
    });

    test("base64-encodes plain refnr from URL for API call", async () => {
      const refnr = "10000-12345";
      const { site, stubFetch } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: { stellenangebotsTitel: "Senior Dev" },
        },
      });

      const vacancyUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refnr}`;
      await site.getVacancyDetails(vacancyUrl);

      expect(
        stubFetch.requestedUrls[0].includes(`/jobdetails/${btoa(refnr)}`),
      ).toBeTruthy();
    });
  });
});
