import { test, describe, expect } from "vitest"
import path from "node:path"
import { createZalandoSite } from "."
import { createStubBrowser } from "@/plugins/browser/testing"

describe("zalando", () => {
  test("getVacancyList returns absolute URLs from search page", async () => {
    const browser = createStubBrowser(SAMPLES_DIR)
    const site = createZalandoSite(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
      mode: "employment",
    })
    expect(urls.length > 0).toBeTruthy()
    for (const url of urls) {
      expect(url).toMatch(/^https?:\/\//)
    }
  })

  test("getVacancyDetails returns title and company", async () => {
    const browser = createStubBrowser(SAMPLES_DIR)
    const site = createZalandoSite(browser)
    const { urls } = await site.getVacancyList({
      location: "Berlin",
      query: "",
      radiusKm: 30,
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
    const browser = createStubBrowser({ [vacancyUrl]: html })
    const site = createZalandoSite(browser)
    const vacancy = await site.getVacancyDetails(vacancyUrl)
    const descriptionHtml = expectDescriptionHtml(vacancy.descriptionHtml)
    expect(descriptionHtml.includes("<strong>talented engineer</strong>")).toBe(
      true,
    )
    expect(descriptionHtml.includes("<li>Requirement number 1")).toBe(true)
  })
})

const SAMPLES_DIR = path.join(import.meta.dirname, "html_samples")

function expectDescriptionHtml(descriptionHtml: string | undefined): string {
  expect(descriptionHtml).toBeTruthy()
  if (!descriptionHtml) {
    throw new Error("Expected vacancy description HTML")
  }
  return descriptionHtml
}
