import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchApiUrl,
  mapSearchResponse,
  mapDetailsResponse,
  createArbeitsagenturSite,
} from "./index.js";
import { createStubBrowser } from "@/plugins/browser/stub/index.js";

describe("arbeitsagentur", () => {
  describe("buildSearchApiUrl", () => {
    test("builds URL with query, location, and defaults", () => {
      const url = buildSearchApiUrl({
        location: "Berlin",
        query: "Software",
        mode: "employment",
      });
      assert.ok(url.includes("was=Software"));
      assert.ok(url.includes("wo=Berlin"));
      assert.ok(url.includes("angebotsart=1"));
      assert.ok(url.includes("umkreis=25"));
      assert.ok(url.includes("page=1"));
      assert.ok(url.includes("size=25"));
    });

    test("omits was param when query is empty", () => {
      const url = buildSearchApiUrl({
        location: "Berlin",
        query: "",
        mode: "employment",
      });
      assert.ok(!url.includes("was="));
    });

    test("sets angebotsart=4 for apprenticeship", () => {
      const url = buildSearchApiUrl({
        location: "München",
        query: "",
        mode: "apprenticeship",
      });
      assert.ok(url.includes("angebotsart=4"));
      assert.ok(!url.includes("berufserfahrung"));
    });

    test("sets berufserfahrung=BEL for entry-level", () => {
      const url = buildSearchApiUrl({
        location: "Hamburg",
        query: "",
        mode: "entry-level",
      });
      assert.ok(url.includes("angebotsart=1"));
      assert.ok(url.includes("berufserfahrung=BEL"));
    });

    test("uses custom radiusKm", () => {
      const url = buildSearchApiUrl({
        location: "Berlin",
        query: "",
        mode: "employment",
        radiusKm: 50,
      });
      assert.ok(url.includes("umkreis=50"));
    });

    test("uses pageId for pagination", () => {
      const url = buildSearchApiUrl(
        { location: "Berlin", query: "", mode: "employment" },
        "3",
      );
      assert.ok(url.includes("page=3"));
    });
  });

  describe("mapSearchResponse", () => {
    test("maps search results to URLs with base64-encoded refnr", () => {
      const result = mapSearchResponse({
        stellenangebote: [{ refnr: "10000-111" }, { refnr: "10000-222" }],
        maxErgebnisse: 100,
        page: 1,
        size: 25,
      });
      assert.equal(result.urls.length, 2);
      assert.ok(result.urls[0].includes(btoa("10000-111")));
      assert.ok(result.urls[1].includes(btoa("10000-222")));
      assert.equal(result.nextPageId, "2");
    });

    test("returns no nextPageId on last page", () => {
      const result = mapSearchResponse({
        stellenangebote: [{ refnr: "ref" }],
        maxErgebnisse: 2,
        page: 1,
        size: 25,
      });
      assert.equal(result.nextPageId, undefined);
    });

    test("handles empty results", () => {
      const result = mapSearchResponse({
        stellenangebote: [],
        maxErgebnisse: 0,
        page: 1,
        size: 25,
      });
      assert.deepEqual(result.urls, []);
      assert.equal(result.nextPageId, undefined);
    });

    test("handles missing stellenangebote", () => {
      const result = mapSearchResponse({
        maxErgebnisse: 0,
        page: 1,
        size: 25,
        stellenangebote: undefined,
      });
      assert.deepEqual(result.urls, []);
      assert.equal(result.nextPageId, undefined);
    });
  });

  describe("mapDetailsResponse", () => {
    test("maps all fields from API response", () => {
      const details = mapDetailsResponse(
        {
          stellenangebotsTitel: "Software Engineer",
          stellenangebotsBeschreibung: "Great job description",
          firma: "Test GmbH",
          stellenlokationen: [
            {
              adresse: { strasse: "Hauptstr. 1", plz: "10115", ort: "Berlin" },
            },
          ],
          eintrittszeitraum: { von: "2026-04-01" },
          veroeffentlichungszeitraum: { von: "2026-03-15" },
          referenznummer: "10000-111",
        },
        "https://www.arbeitsagentur.de/jobsuche/jobdetail/abc123",
      );
      assert.equal(details.title, "Software Engineer");
      assert.equal(details.company, "Test GmbH");
      assert.equal(details.address, "Hauptstr. 1, 10115 Berlin");
      assert.equal(details.descriptionHtml, "Great job description");
      assert.equal(details.startDate, "2026-04-01");
      assert.equal(details.publishedAt, "2026-03-15");
      assert.equal(details.contact, undefined);
    });

    test("handles missing address fields", () => {
      const details = mapDetailsResponse(
        { stellenangebotsTitel: "Dev" },
        "https://example.com/job",
      );
      assert.equal(details.address, undefined);
    });

    test("filters out null string values in address", () => {
      const details = mapDetailsResponse(
        {
          stellenangebotsTitel: "Dev",
          stellenlokationen: [
            { adresse: { strasse: "null", plz: "10115", ort: "Berlin" } },
          ],
        },
        "https://example.com/job",
      );
      assert.equal(details.address, "10115 Berlin");
    });
  });

  describe("ArbeitsagenturSite class", () => {
    test("getVacancyList fetches search API and returns URLs", async () => {
      const searchResponse = {
        stellenangebote: [{ refnr: "ref1" }, { refnr: "ref2" }],
        maxErgebnisse: 50,
        page: 1,
        size: 25,
      };

      const fetchMock = mock.method(globalThis, "fetch", () =>
        Promise.resolve(
          new Response(JSON.stringify(searchResponse), { status: 200 }),
        ),
      );

      try {
        const site = createArbeitsagenturSite(createStubBrowser({}));
        const result = await site.getVacancyList({
          location: "Berlin",
          query: "Developer",
          mode: "employment",
        });

        assert.equal(result.urls.length, 2);
        assert.ok(result.urls[0].includes(btoa("ref1")));
        assert.ok(result.urls[1].includes(btoa("ref2")));
        assert.equal(result.nextPageId, "2");
        assert.equal(fetchMock.mock.callCount(), 1);

        const calledUrl = String(fetchMock.mock.calls[0].arguments[0]);
        assert.ok(calledUrl.includes("was=Developer"));
        assert.ok(calledUrl.includes("wo=Berlin"));
      } finally {
        fetchMock.mock.restore();
      }
    });

    test("getVacancyDetails fetches details API with base64 refnr", async () => {
      const detailsResponse = {
        stellenangebotsTitel: "Senior Dev",
        stellenangebotsBeschreibung: "Description text",
        firma: "Test Corp",
        stellenlokationen: [{ adresse: { plz: "10115", ort: "Berlin" } }],
        eintrittszeitraum: { von: "2026-05-01" },
        veroeffentlichungszeitraum: { von: "2026-03-20" },
      };

      const fetchMock = mock.method(globalThis, "fetch", () =>
        Promise.resolve(
          new Response(JSON.stringify(detailsResponse), { status: 200 }),
        ),
      );

      try {
        const site = createArbeitsagenturSite(createStubBrowser({}));
        const refnr = "10000-12345";
        const vacancyUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${btoa(refnr)}`;

        const details = await site.getVacancyDetails(vacancyUrl);

        assert.equal(details.title, "Senior Dev");
        assert.equal(details.company, "Test Corp");
        assert.equal(details.address, "10115 Berlin");
        assert.equal(details.descriptionHtml, "Description text");

        const detailsUrl = String(fetchMock.mock.calls[0].arguments[0]);
        assert.ok(
          detailsUrl.includes(`/jobdetails/${btoa(refnr)}`),
          `Expected base64-encoded refnr in URL, got: ${detailsUrl}`,
        );
      } finally {
        fetchMock.mock.restore();
      }
    });
  });
});
