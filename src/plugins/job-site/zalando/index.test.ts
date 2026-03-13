import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { join } from "path";
import { createZalandoSite } from "./index.js";
import { createStubBrowser } from "@/plugins/browser/stub/index.js";

const SAMPLES_DIR = join(import.meta.dirname ?? __dirname, "html_samples");

describe("zalando", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = createStubBrowser(SAMPLES_DIR);
    const site = createZalandoSite(browser);
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
    const site = createZalandoSite(browser);
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

  test("getVacancyDetails returns raw HTML from section", async () => {
    const items = Array.from(
      { length: 30 },
      (_, i) => `<li>Requirement number ${i + 1} that is detailed enough</li>`,
    ).join("");
    const html = `
      <html><body>
        <h1>Software Engineer</h1>
        <section>
          <h2>About the Role</h2>
          <p>We are looking for a <strong>talented engineer</strong> to join us.</p>
          <h3>Requirements</h3>
          <ul>${items}</ul>
        </section>
      </body></html>
    `;
    const vacancyUrl = "https://jobs.zalando.com/en/jobs/12345";
    const browser = createStubBrowser({ [vacancyUrl]: html });
    const site = createZalandoSite(browser);
    const vacancy = await site.getVacancyDetails(vacancyUrl);
    assert.ok(vacancy.descriptionHtml, "Expected descriptionHtml");
    assert.ok(
      vacancy.descriptionHtml!.includes("<strong>talented engineer</strong>"),
      "Expected raw HTML bold",
    );
    assert.ok(
      vacancy.descriptionHtml!.includes("<li>Requirement number 1"),
      "Expected raw HTML list items",
    );
  });
});
