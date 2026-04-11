import { describe, it, expect, vi } from "vitest"
import { SiteCrawler } from "."
import type {
  JobSite,
  VacancyDetails,
  VacancyListPage,
} from "@/plugins/job-site/types.js"
import type { JobSearchCriteria } from "@/models/job-search/types.js"

describe("SiteCrawler", () => {
  it("calls onResult for each vacancy detail fetched", async () => {
    const details = makeDetails()
    const site = makeSite({
      pages: [
        { urls: ["https://example.com/job/1", "https://example.com/job/2"] },
      ],
      details,
    })
    site.getVacancyDetails = vi
      .fn()
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/1" }))
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/2" }))

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(2)
  })

  it("respects limit from criteria", async () => {
    const getVacancyDetailsMock = vi.fn().mockResolvedValue(makeDetails())
    const site = makeSite({
      pages: [
        { urls: ["url1", "url2", "url3", "url4", "url5"], nextPageId: "p2" },
      ],
      getVacancyDetails: getVacancyDetailsMock,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: { ...CRITERIA, limit: 2 },
      onResult: (d) => results.push(d),
    })

    expect(getVacancyDetailsMock).toHaveBeenCalledTimes(2)
  })

  it("stops on abort signal", async () => {
    const controller = new AbortController()
    const site: JobSite = {
      name: "test-site",
      supportedModes: ["employment"],
      getVacancyList: vi.fn().mockImplementation(() => {
        controller.abort()
        return Promise.resolve({ urls: ["url1"] })
      }),
      getVacancyDetails: vi.fn().mockResolvedValue(makeDetails()),
    }

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: CRITERIA,
      signal: controller.signal,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(0)
  })

  it("skips site with unsupported mode", async () => {
    const getVacancyListMock = vi.fn().mockResolvedValue({ urls: ["url1"] })
    const site = makeSite({ getVacancyList: getVacancyListMock })
    ;(site as { supportedModes: string[] }).supportedModes = ["apprenticeship"]

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: { ...CRITERIA, mode: "employment" },
      onResult: (d) => results.push(d),
    })

    expect(getVacancyListMock).not.toHaveBeenCalled()
    expect(results.length).toBe(0)
  })

  it("falls back to employment mode for entry-level when site supports employment", async () => {
    const getVacancyListMock = vi.fn().mockResolvedValue({ urls: ["url1"] })
    const site = makeSite({
      pages: [{ urls: ["url1"] }],
      getVacancyList: getVacancyListMock,
    })
    ;(site as { supportedModes: string[] }).supportedModes = ["employment"]

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: { ...CRITERIA, mode: "entry-level" },
      onResult: (d) => results.push(d),
    })

    expect(getVacancyListMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "employment" }),
      undefined,
    )
  })

  it("passes resolved plugin criteria without crawler limit", async () => {
    const getVacancyListMock = vi.fn().mockResolvedValue({ urls: [] })
    const site = makeSite({ getVacancyList: getVacancyListMock })

    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: { ...CRITERIA, limit: 2 },
      onResult: vi.fn(),
    })

    const criteria = getVacancyListMock.mock.calls[0][0]
    expect(criteria).toMatchObject({
      location: CRITERIA.location,
      query: CRITERIA.query,
      radiusKm: CRITERIA.radiusKm,
      mode: CRITERIA.mode,
    })
    expect(Object.hasOwn(criteria, "limit")).toBe(false)
  })

  it("continues after search page fetch failure", async () => {
    const site1: JobSite = {
      name: "failing-site",
      supportedModes: ["employment"],
      getVacancyList: vi.fn().mockRejectedValue(new Error("network error")),
      getVacancyDetails: vi.fn(),
    }
    const site2 = makeSite({
      pages: [{ urls: ["url1"] }],
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site1, site2],
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(1)
  })

  it("skips URL when vacancy detail fetch fails", async () => {
    const site = makeSite({
      pages: [{ urls: ["url1", "url2"] }],
    })
    ;(site.getVacancyDetails as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(makeDetails({ url: "url2" }))

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(1)
    expect(results[0].url).toBe("url2")
  })

  it("processes multiple sites sequentially", async () => {
    const details1 = makeDetails({ url: "url1", company: "A" })
    const details2 = makeDetails({ url: "url2", company: "B" })
    const site1 = makeSite({ pages: [{ urls: ["url1"] }], details: details1 })
    const site2 = makeSite({ pages: [{ urls: ["url2"] }], details: details2 })
    ;(site2 as { name: string }).name = "site2"

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site1, site2],
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(2)
    expect(results.map((r) => r.company)).toEqual(["A", "B"])
  })
})

const CRITERIA: JobSearchCriteria = {
  location: "Berlin",
  query: "developer",
  radiusKm: 50,
  mode: "employment",
}

function makeSite(
  overrides: Partial<JobSite> & {
    pages?: VacancyListPage[]
    details?: VacancyDetails
  } = {},
): JobSite {
  const { pages = [], details = makeDetails(), ...rest } = overrides
  let pageIndex = 0
  return {
    name: "test-site",
    supportedModes: ["employment"],
    getVacancyList: vi.fn().mockImplementation(() => {
      const page = pages[pageIndex++]
      return Promise.resolve(page)
    }),
    getVacancyDetails: vi.fn().mockResolvedValue(details),
    ...rest,
  }
}

function makeDetails(overrides: Partial<VacancyDetails> = {}): VacancyDetails {
  return {
    url: "https://example.com/job/1",
    title: "Developer",
    company: "ACME",
    ...overrides,
  }
}
