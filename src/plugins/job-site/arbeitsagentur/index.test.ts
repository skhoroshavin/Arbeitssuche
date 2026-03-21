import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createArbeitsagenturSite } from "./index.js";
import { createStubBrowser } from "@/plugins/browser/stub/index.js";
import { createStubFetch } from "@/plugins/fetch/stub/index.js";
import type { SearchCriteria } from "@/plugins/job-site/types.js";

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
      assert.ok(url.includes("was=Software"));
      assert.ok(url.includes("wo=Berlin"));
      assert.ok(url.includes("angebotsart=1"));
      assert.ok(url.includes("umkreis=25"));
      assert.ok(url.includes("page=1"));
      assert.ok(url.includes("size=25"));
    });

    test("omits was param when query is empty", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList({ ...baseCriteria, query: "" });

      assert.ok(!stubFetch.requestedUrls[0].includes("was="));
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
      assert.ok(url.includes("angebotsart=4"));
      assert.ok(!url.includes("berufserfahrung"));
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
      assert.ok(url.includes("angebotsart=1"));
      assert.ok(url.includes("berufserfahrung=BEL"));
    });

    test("uses custom radiusKm", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList({ ...baseCriteria, radiusKm: 50 });

      assert.ok(stubFetch.requestedUrls[0].includes("umkreis=50"));
    });

    test("uses pageId for pagination", async () => {
      const { site, stubFetch } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      await site.getVacancyList(baseCriteria, "3");

      assert.ok(stubFetch.requestedUrls[0].includes("page=3"));
    });
  });

  describe("getVacancyList response mapping", () => {
    test("maps search results to URLs with base64-encoded refnr", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: searchResponse({
            stellenangebote: [{ refnr: "10000-111" }, { refnr: "10000-222" }],
            maxErgebnisse: 100,
          }),
        },
      });
      const result = await site.getVacancyList(baseCriteria);

      assert.equal(result.urls.length, 2);
      assert.ok(result.urls[0].includes(btoa("10000-111")));
      assert.ok(result.urls[1].includes(btoa("10000-222")));
      assert.equal(result.nextPageId, "2");
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

      assert.equal(result.nextPageId, undefined);
    });

    test("handles empty results", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: { body: searchResponse() },
      });
      const result = await site.getVacancyList(baseCriteria);

      assert.deepEqual(result.urls, []);
      assert.equal(result.nextPageId, undefined);
    });

    test("handles missing stellenangebote", async () => {
      const { site } = createSite({
        [SEARCH_URL_PATTERN]: {
          body: { maxErgebnisse: 0, page: 1, size: 25 },
        },
      });
      const result = await site.getVacancyList(baseCriteria);

      assert.deepEqual(result.urls, []);
      assert.equal(result.nextPageId, undefined);
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

      assert.equal(details.title, "Software Engineer");
      assert.equal(details.company, "Test GmbH");
      assert.equal(details.address, "Hauptstr. 1, 10115 Berlin");
      assert.equal(details.descriptionHtml, "Great job description");
      assert.equal(details.startDate, "2026-04-01");
      assert.equal(details.publishedAt, "2026-03-15");
      assert.equal(details.contact, undefined);
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

      assert.equal(details.address, undefined);
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

      assert.equal(details.address, "10115 Berlin");
    });

    test("fetches details API with base64 refnr from URL", async () => {
      const refnr = "10000-12345";
      const encodedRefnr = btoa(refnr);
      const { site, stubFetch } = createSite({
        [DETAILS_URL_PATTERN]: {
          body: { stellenangebotsTitel: "Senior Dev" },
        },
      });

      const vacancyUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodedRefnr}`;
      await site.getVacancyDetails(vacancyUrl);

      assert.ok(
        stubFetch.requestedUrls[0].includes(`/jobdetails/${encodedRefnr}`),
      );
    });
  });
});
