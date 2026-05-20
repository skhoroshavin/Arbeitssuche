import { test, describe, beforeAll, afterAll, expect } from "vitest"
import { createPlaywrightBrowser, type Browser } from "@/plugins/browser"
import { getJobSiteProviders } from "."

describe("job-site plugins", () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await createPlaywrightBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  const SKIP_SITES = new Set<string>(["xing"])

  for (const provider of getJobSiteProviders()) {
    const mode = provider.supportedModes[0]
    const skip = SKIP_SITES.has(provider.id)

    test.skipIf(skip)(
      `/${provider.id} (${mode}) - pagination returns unique URLs`,
      async () => {
        const site = provider.createScraper(browser)
        const criteria = {
          location: "Berlin",
          query: "",
          radiusKm: 10,
          mode: mode,
        }

        const allUrls = new Set<string>()
        const perPageUrls: string[][] = []
        let pageId: string | undefined
        const MAX_TEST_PAGES = 3

        for (let p = 0; p < MAX_TEST_PAGES; p++) {
          const result = await site.getVacancyList(criteria, pageId)
          expect(result.urls).toBeInstanceOf(Array)

          const pageUrls = new Set(result.urls)
          expect(pageUrls.size).toBe(result.urls.length)

          perPageUrls.push(result.urls)
          for (const url of result.urls) allUrls.add(url)

          if (!result.nextPageId) break
          pageId = result.nextPageId
        }

        expect(allUrls.size).toBeGreaterThan(0)

        if (perPageUrls.length > 1) {
          const totalRaw = perPageUrls.reduce((s, p) => s + p.length, 0)
          console.log(
            `  [${provider.id}] ${perPageUrls.length} pages, ${totalRaw} raw URLs, ${allUrls.size} unique`,
          )
        }
      },
      60_000,
    )

    test.skipIf(skip)(
      `/${provider.id} (${mode}) - vacancy details produce usable data`,
      async () => {
        const site = provider.createScraper(browser)
        const criteria = {
          location: "Berlin",
          query: "",
          radiusKm: 10,
          mode: mode,
        }

        const { urls } = await site.getVacancyList(criteria)
        expect(urls.length).toBeGreaterThan(0)

        const sample = urls.slice(0, 5)
        let foundUsableData = false

        for (const url of sample) {
          const details = await site.getVacancyDetails(url)
          expect(details).toBeTruthy()

          if (
            details.title.trim().length > 0 &&
            details.company.trim().length > 0 &&
            details.url.trim().length > 0
          ) {
            foundUsableData = true
            break
          }

          console.log(`  [${provider.id}] vacancy missing usable data: ${url}`)
        }

        expect(foundUsableData).toBe(true)
      },
      60_000,
    )
  }
})
