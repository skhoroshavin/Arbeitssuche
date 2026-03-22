import { test, describe, expect } from "vitest";
import { join } from "path";
import { createZalandoSite } from "./index";
import { createStubBrowser } from "@/plugins/browser/stub/index";

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
    expect(urls.length > 0).toBeTruthy();
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//);
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
    expect(
      typeof vacancy.title === "string" && vacancy.title.length > 0,
    ).toBeTruthy();
    expect(
      typeof vacancy.company === "string" && vacancy.company.length > 0,
    ).toBeTruthy();
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
    expect(vacancy.descriptionHtml).toBeTruthy();
    expect(
      vacancy.descriptionHtml!.includes("<strong>talented engineer</strong>"),
    ).toBeTruthy();
    expect(
      vacancy.descriptionHtml!.includes("<li>Requirement number 1"),
    ).toBeTruthy();
  });
});
