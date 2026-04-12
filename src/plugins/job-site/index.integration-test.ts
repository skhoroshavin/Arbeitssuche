import { test, describe, beforeAll, afterAll, expect } from "vitest"
import { createPlaywrightBrowser } from "@/plugins/browser/create"
import type { Browser } from "@/plugins/browser"
import { createJobSite, getJobSiteInfos } from "./create.js"

describe("job-site plugins", () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await createPlaywrightBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  const SKIPPED_SITES = new Set<string>(["xing"])

  for (const { name, supportedModes } of getJobSiteInfos()) {
    const mode = supportedModes[0]
    const skip = SKIPPED_SITES.has(name)

    test.skipIf(skip)(
      `${name} (${mode}) - pagination returns unique URLs`,
      async () => {
        const site = createJobSite(name, browser)
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

          // Verify URLs within this page are unique
          const pageUrls = new Set(result.urls)
          expect(pageUrls.size).toBe(result.urls.length)

          perPageUrls.push(result.urls)
          for (const url of result.urls) allUrls.add(url)

          if (!result.nextPageId) break
          pageId = result.nextPageId
        }

        expect(allUrls.size).toBeGreaterThan(0)

        // Log overlap for diagnostics
        if (perPageUrls.length > 1) {
          const totalRaw = perPageUrls.reduce((s, p) => s + p.length, 0)
          console.log(
            `  [${name}] ${perPageUrls.length} pages, ${totalRaw} raw URLs, ${allUrls.size} unique`,
          )
        }
      },
      60_000,
    )

    test.skipIf(skip)(
      `${name} (${mode}) - vacancy details from Berlin`,
      async () => {
        const site = createJobSite(name, browser)
        const criteria = {
          location: "Berlin",
          query: "",
          radiusKm: 10,
          mode: mode,
        }

        const { urls } = await site.getVacancyList(criteria)
        expect(urls.length).toBeGreaterThan(0)

        const berlinPattern =
          /berlin|potsdam|hennigsdorf|falkensee|oranienburg|teltow|bernau|königs wusterhausen|schönefeld|wildau|ludwigsfelde/i

        const sample = urls.slice(0, 5)
        let foundBerlinAddress = false

        for (const url of sample) {
          const details = await site.getVacancyDetails(url)
          expect(details).toBeTruthy()

          if (!details.address) {
            console.log(`  [${name}] vacancy has no address, skipping: ${url}`)
            continue
          }

          if (berlinPattern.test(details.address)) {
            foundBerlinAddress = true
            break
          }

          console.log(
            `  [${name}] address not in Berlin area: "${details.address}" (${url})`,
          )
        }

        expect(foundBerlinAddress).toBe(true)
      },
      60_000,
    )
  }
})
