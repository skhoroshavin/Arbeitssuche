import { test, describe, expect } from "vitest";
import path from "node:path";
import { createXingSite } from "./index";
import { createStubBrowser } from "@/plugins/browser/index.js";

describe("xing", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = createStubBrowser(SAMPLES_DIR);
    const site = createXingSite(browser);
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      mode: "employment",
    });
    expect(urls.length > 0).toBeTruthy();
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//);
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
    expect(
      typeof vacancy.title === "string" && vacancy.title.length > 0,
    ).toBeTruthy();
    expect(
      typeof vacancy.company === "string" && vacancy.company.length > 0,
    ).toBeTruthy();
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
    expect(vacancy.descriptionHtml).toBeTruthy();
    expect(vacancy.descriptionHtml!.includes("<li>React</li>")).toBeTruthy();
    expect(
      vacancy.descriptionHtml!.includes("<strong>TypeScript</strong>"),
    ).toBeTruthy();
  });
});

const SAMPLES_DIR = path.join(import.meta.dirname, "html_samples");
