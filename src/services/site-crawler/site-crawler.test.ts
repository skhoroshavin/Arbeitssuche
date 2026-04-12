import { describe, it, expect, vi } from "vitest"
import { SiteCrawler } from "."
import type {
  JobSite,
  VacancyDetails,
  VacancyListPage,
} from "@/plugins/job-site"
import type { JobSearchCriteria } from "@/models/job-search"

describe("SiteCrawler", () => {
  it("calls onResult for each vacancy detail fetched", async () => {
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/1" }))
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/2" }))
    const site = makeSite({
      pages: [
        { urls: ["https://example.com/job/1", "https://example.com/job/2"] },
      ],
      getVacancyDetails: getVacancyDetailsMock,
    })

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
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockResolvedValue(makeDetails())
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
    const site = makeSite({
      getVacancyList: vi
        .fn<JobSite["getVacancyList"]>()
        .mockImplementation(() => {
          controller.abort()
          return Promise.resolve({ urls: ["url1"] })
        }),
      getVacancyDetails: vi
        .fn<JobSite["getVacancyDetails"]>()
        .mockResolvedValue(makeDetails()),
    })

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
    const getVacancyListMock = vi
      .fn<JobSite["getVacancyList"]>()
      .mockResolvedValue({ urls: ["url1"] })
    const site = makeSite({
      getVacancyList: getVacancyListMock,
      supportedModes: ["apprenticeship"],
    })

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
    const getVacancyListMock = vi
      .fn<JobSite["getVacancyList"]>()
      .mockResolvedValue({ urls: ["url1"] })
    const site = makeSite({
      pages: [{ urls: ["url1"] }],
      getVacancyList: getVacancyListMock,
      supportedModes: ["employment"],
    })

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
    const getVacancyListMock = vi
      .fn<JobSite["getVacancyList"]>()
      .mockResolvedValue({ urls: [] })
    const site = makeSite({ getVacancyList: getVacancyListMock })

    const crawler = new SiteCrawler()
    await crawler.crawl({
      sites: [site],
      criteria: { ...CRITERIA, limit: 2 },
      onResult: vi.fn(),
    })

    expect(getVacancyListMock).toHaveBeenCalledOnce()
    const [criteria] = getVacancyListMock.mock.calls[0]
    expect(criteria).toMatchObject({
      location: CRITERIA.location,
      query: CRITERIA.query,
      radiusKm: CRITERIA.radiusKm,
      mode: CRITERIA.mode,
    })
    expect(Object.hasOwn(criteria, "limit")).toBe(false)
  })

  it("continues after search page fetch failure", async () => {
    const site1 = makeSite({
      name: "failing-site",
      getVacancyList: vi
        .fn<JobSite["getVacancyList"]>()
        .mockRejectedValue(new Error("network error")),
      getVacancyDetails: vi.fn<JobSite["getVacancyDetails"]>(),
    })
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
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(makeDetails({ url: "url2" }))
    const site = makeSite({
      pages: [{ urls: ["url1", "url2"] }],
      getVacancyDetails: getVacancyDetailsMock,
    })

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
    const site2 = makeSite({
      name: "site2",
      pages: [{ urls: ["url2"] }],
      details: details2,
    })

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

function makeSite(overrides: MakeSiteOptions = {}): JobSite {
  const site: JobSite = {
    name: "test-site",
    supportedModes: ["employment"],
    getVacancyList: createVacancyListMock(overrides.pages),
    getVacancyDetails: createVacancyDetailsMock(overrides.details),
  }

  if (overrides.name) {
    site.name = overrides.name
  }
  if (overrides.supportedModes) {
    site.supportedModes = overrides.supportedModes
  }
  if (overrides.getVacancyList) {
    site.getVacancyList = overrides.getVacancyList
  }
  if (overrides.getVacancyDetails) {
    site.getVacancyDetails = overrides.getVacancyDetails
  }

  return site
}

type MakeSiteOptions = {
  name?: string
  supportedModes?: JobSite["supportedModes"]
  pages?: VacancyListPage[]
  details?: VacancyDetails
  getVacancyList?: JobSite["getVacancyList"]
  getVacancyDetails?: JobSite["getVacancyDetails"]
}

function createVacancyListMock(pages: VacancyListPage[] = []) {
  let pageIndex = 0
  return vi.fn<JobSite["getVacancyList"]>().mockImplementation(() => {
    const page = pages[pageIndex++] ?? { urls: [] }
    return Promise.resolve(page)
  })
}

function createVacancyDetailsMock(details: VacancyDetails = makeDetails()) {
  return vi.fn<JobSite["getVacancyDetails"]>().mockResolvedValue(details)
}

function makeDetails(overrides: Partial<VacancyDetails> = {}): VacancyDetails {
  return {
    url: "https://example.com/job/1",
    title: "Developer",
    company: "ACME",
    ...overrides,
  }
}
