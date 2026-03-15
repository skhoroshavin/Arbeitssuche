import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createPlaywrightBrowser } from "@/plugins/browser/playwright/index.js";
import type { Browser } from "@/plugins/browser/types.js";
import { createJobSite, getJobSiteInfos } from "./index.js";
import type { SearchMode } from "./types.js";

describe("job-site plugins", () => {
  let browser: Browser;

  before(async () => {
    browser = await createPlaywrightBrowser();
  });

  after(async () => {
    await browser?.close();
  });

  for (const { name, supportedModes } of getJobSiteInfos()) {
    const mode = supportedModes[0];

    test(
      `${name} (${mode}) - pagination returns unique URLs`,
      { timeout: 60_000 },
      async () => {
        const site = createJobSite(name, browser);
        const criteria = {
          location: "Berlin",
          query: "",
          radiusKm: 10,
          mode: mode as SearchMode,
        };

        const allUrls = new Set<string>();
        const perPageUrls: string[][] = [];
        let pageId: string | undefined;
        const MAX_TEST_PAGES = 3;

        for (let p = 0; p < MAX_TEST_PAGES; p++) {
          const result = await site.getVacancyList(criteria, pageId);
          assert.ok(Array.isArray(result.urls));

          // Verify URLs within this page are unique
          const pageUrls = new Set(result.urls);
          assert.equal(
            pageUrls.size,
            result.urls.length,
            `[${name}] page ${p + 1}: URLs within page should be unique`,
          );

          perPageUrls.push(result.urls);
          for (const url of result.urls) allUrls.add(url);

          if (!result.nextPageId) break;
          pageId = result.nextPageId;
        }

        assert.ok(
          allUrls.size > 0,
          `${name} (${mode}): expected at least 1 URL, got 0`,
        );

        // Log overlap for diagnostics
        if (perPageUrls.length > 1) {
          const totalRaw = perPageUrls.reduce((s, p) => s + p.length, 0);
          console.log(
            `  [${name}] ${perPageUrls.length} pages, ${totalRaw} raw URLs, ${allUrls.size} unique`,
          );
        }
      },
    );

    test(
      `${name} (${mode}) - vacancy details from Berlin`,
      { timeout: 60_000 },
      async () => {
        const site = createJobSite(name, browser);
        const criteria = {
          location: "Berlin",
          query: "",
          radiusKm: 10,
          mode: mode as SearchMode,
        };

        const { urls } = await site.getVacancyList(criteria);
        assert.ok(
          urls.length > 0,
          `${name} (${mode}): need at least 1 URL to test details`,
        );

        const berlinPattern =
          /berlin|potsdam|hennigsdorf|falkensee|oranienburg|teltow|bernau|königs wusterhausen|schönefeld|wildau|ludwigsfelde/i;

        const sample = urls.slice(0, 5);
        let foundBerlinAddress = false;

        for (const url of sample) {
          const details = await site.getVacancyDetails(url);
          assert.ok(details, `Expected details for ${url}`);

          if (!details.address) {
            console.log(`  [${name}] vacancy has no address, skipping: ${url}`);
            continue;
          }

          if (berlinPattern.test(details.address)) {
            foundBerlinAddress = true;
            break;
          }

          console.log(
            `  [${name}] address not in Berlin area: "${details.address}" (${url})`,
          );
        }

        assert.ok(
          foundBerlinAddress,
          `${name}: none of ${sample.length} sampled vacancies had a Berlin-area address`,
        );
      },
    );
  }
});
