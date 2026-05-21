import { test, describe, expect } from "vitest"
import path from "node:path"
import { ZalandoProvider } from "."
import { BrowserStub } from "@/plugins/browser"

describe("zalando", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = ZalandoProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 15,
      mode: "employment",
    })
    expect(urls.length > 0).toBeTruthy()
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//)
    }
  })

  test("getVacancyDetails returns title and company", async () => {
    const browser = BrowserStub.fromDirectory(SAMPLES_DIR)
    const site = ZalandoProvider.createScraper(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 15,
      mode: "employment",
    })
    const vacancy = await site.getVacancyDetails(urls[0])
    expect(
      typeof vacancy.title === "string" && vacancy.title.length > 0,
    ).toBeTruthy()
    expect(
      typeof vacancy.company === "string" && vacancy.company.length > 0,
    ).toBeTruthy()
  })

  test("getVacancyDetails returns raw HTML from section", async () => {
    const items = Array.from(
      { length: 30 },
      (_, index) =>
        `<li>Requirement number ${index + 1} that is detailed enough</li>`,
    ).join("")
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
    `
    const vacancyUrl = "https://jobs.zalando.com/en/jobs/12345"
    const browser = new BrowserStub().set(vacancyUrl, html)
    const site = ZalandoProvider.createScraper(browser)
    const vacancy = await site.getVacancyDetails(vacancyUrl)
    expect(vacancy.descriptionHtml.length).toBeGreaterThan(0)
    expect(
      vacancy.descriptionHtml.includes("<strong>talented engineer</strong>"),
    ).toBe(true)
    expect(vacancy.descriptionHtml.includes("<li>Requirement number 1")).toBe(
      true,
    )
  })
})

const SAMPLES_DIR = path.join(import.meta.dirname, "html_samples")
