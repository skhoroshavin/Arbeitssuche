import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { join } from "path";
import { createXingSite } from "./index.js";
import { createStubBrowser } from "@/plugins/browser/stub/index.js";

const SAMPLES_DIR = join(import.meta.dirname ?? __dirname, "html_samples");

describe("xing", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = createStubBrowser(SAMPLES_DIR);
    const site = createXingSite(browser);
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
    const site = createXingSite(browser);
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
        <h1>Frontend Developer</h1>
        <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Frontend Developer",
          "hiringOrganization": { "name": "Test AG" },
          "description": "<h3>Requirements</h3><ul><li>React</li><li><strong>TypeScript</strong></li></ul>",
          "datePosted": "2026-01-01"
        }
        </script>
      </body></html>
    `;
    const vacancyUrl = "https://www.xing.com/jobs/test-job-123";
    const browser = createStubBrowser({ [vacancyUrl]: html });
    const site = createXingSite(browser);
    const vacancy = await site.getVacancyDetails(vacancyUrl);
    assert.ok(vacancy.descriptionHtml, "Expected descriptionHtml");
    assert.ok(
      vacancy.descriptionHtml!.includes("<li>React</li>"),
      "Expected raw HTML list items",
    );
    assert.ok(
      vacancy.descriptionHtml!.includes("<strong>TypeScript</strong>"),
      "Expected raw HTML bold",
    );
  });
});
