import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { join } from "path";
import { createArbeitsagenturSite } from "./index.js";
import { createStubBrowser } from "@/plugins/browser/stub/index.js";

const SAMPLES_DIR = join(import.meta.dirname ?? __dirname, "html_samples");

describe("arbeitsagentur", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = createStubBrowser(SAMPLES_DIR);
    const site = createArbeitsagenturSite(browser);
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
    const site = createArbeitsagenturSite(browser);
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

  test("getVacancyDetails returns descriptionHtml", async () => {
    const browser = createStubBrowser(SAMPLES_DIR);
    const site = createArbeitsagenturSite(browser);
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      mode: "employment",
    });
    const vacancy = await site.getVacancyDetails(urls[0]);
    assert.ok(
      typeof vacancy.descriptionHtml === "string" &&
        vacancy.descriptionHtml.length > 0,
      "Expected non-empty descriptionHtml",
    );
  });

  test("getVacancyDetails extracts raw HTML description", async () => {
    const html = `
      <html><body>
        <h2>Software Engineer</h2>
        <div class="firma-lane">Arbeitgeber: Test GmbH</div>
        <jb-detailansicht>
          <h3>Aufgaben</h3>
          <ul><li>Develop features</li><li>Write tests</li></ul>
          <p>We need a <strong>senior</strong> developer.</p>
        </jb-detailansicht>
      </body></html>
    `;
    const vacancyUrl = "https://www.arbeitsagentur.de/jobsuche/stelle/test";
    const browser = createStubBrowser({ [vacancyUrl]: html });
    const site = createArbeitsagenturSite(browser);
    const vacancy = await site.getVacancyDetails(vacancyUrl);
    assert.ok(vacancy.descriptionHtml, "Expected descriptionHtml");
    assert.ok(
      vacancy.descriptionHtml!.includes("<li>"),
      "Expected raw HTML list items",
    );
    assert.ok(
      vacancy.descriptionHtml!.includes("<strong>senior</strong>"),
      "Expected raw HTML bold",
    );
  });
});
