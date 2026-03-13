import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { join } from "path";
import { createDmSite } from "./index.js";
import { createStubBrowser } from "@/plugins/browser/stub/index.js";

const SAMPLES_DIR = join(import.meta.dirname ?? __dirname, "html_samples");

describe("dm", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = createStubBrowser(SAMPLES_DIR);
    const site = createDmSite(browser);
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      mode: "employment",
    });
    assert.ok(urls.length > 0, "Expected at least one URL");
    for (const url of urls) {
      assert.match(url, /^https?:\/\//, `Expected absolute URL, got: ${url}`);
    }
  });

  test("getVacancyDetails returns title and company", async () => {
    const browser = createStubBrowser(SAMPLES_DIR);
    const site = createDmSite(browser);
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      mode: "employment",
    });
    const vacancy = await site.getVacancyDetails(urls[0]);
    assert.ok(
      typeof vacancy.title === "string" && vacancy.title.length > 0,
      "Expected non-empty title",
    );
    assert.ok(
      typeof vacancy.company === "string" && vacancy.company.length > 0,
      "Expected non-empty company",
    );
  });

  test("getVacancyDetails returns raw HTML description from JSON-LD", async () => {
    const html = `
      <html><body>
        <h1>Ausbildung Drogist</h1>
        <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Ausbildung Drogist",
          "hiringOrganization": { "name": "dm" },
          "description": "<p>Join our team as a <strong>Drogist</strong>.</p><ul><li>Training provided</li><li>Good pay</li></ul>",
          "datePosted": "2026-02-01"
        }
        </script>
      </body></html>
    `;
    const vacancyUrl = "https://www.dm-jobs.de/job/test/123";
    const browser = createStubBrowser({ [vacancyUrl]: html });
    const site = createDmSite(browser);
    const vacancy = await site.getVacancyDetails(vacancyUrl);
    assert.ok(vacancy.descriptionHtml, "Expected descriptionHtml");
    assert.ok(
      vacancy.descriptionHtml!.includes("<strong>Drogist</strong>"),
      "Expected raw HTML bold",
    );
    assert.ok(
      vacancy.descriptionHtml!.includes("<li>Training provided</li>"),
      "Expected raw HTML list items",
    );
  });

  test("getVacancyDetails DOM fallback produces HTML with headings", async () => {
    const html = `
      <html><body>
        <h1>Ausbildung Drogist</h1>
        <h2>Aufgaben</h2>
        <div><ul><li>Task one</li><li>Task two</li></ul></div>
        <h2>Benefits</h2>
        <div><p>Great <strong>benefits</strong> package</p></div>
      </body></html>
    `;
    const vacancyUrl = "https://www.dm-jobs.de/job/test/456";
    const browser = createStubBrowser({ [vacancyUrl]: html });
    const site = createDmSite(browser);
    const vacancy = await site.getVacancyDetails(vacancyUrl);
    assert.ok(vacancy.descriptionHtml, "Expected descriptionHtml");
    assert.ok(
      vacancy.descriptionHtml!.includes("<h2>Aufgaben</h2>"),
      "Expected h2 heading in HTML",
    );
    assert.ok(
      vacancy.descriptionHtml!.includes("<li>Task one</li>"),
      "Expected HTML list items",
    );
  });

  test("getVacancyList returns no pagination (single page)", async () => {
    const html = "<html><body></body></html>";
    const browser = createStubBrowser({ "dm-jobs.de/job-listing": html });
    const site = createDmSite(browser);
    const result = await site.getVacancyList({
      location: "Berlin",
      query: "",
      mode: "employment",
    });
    assert.equal(result.nextPageId, undefined, "DM should have no pagination");
  });
});
