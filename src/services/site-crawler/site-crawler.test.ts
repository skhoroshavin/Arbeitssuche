import { describe, it, expect, vi } from "vitest"
import { SiteCrawler } from "."
import type {
  JobSite,
  JobSiteProvider,
  VacancyDetails,
  VacancyListPage,
} from "@/plugins/job-site"
import type { JobSearchCriteria } from "@/models/job-search"
import { BrowserStub } from "@/plugins/browser"
import { Address } from "@/utils/index.js"

describe("SiteCrawler", () => {
  it("calls onResult for each vacancy detail fetched", async () => {
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/1" }))
      .mockResolvedValueOnce(makeDetails({ url: "https://example.com/job/2" }))
    const provider = makeProvider({
      pages: [
        { urls: ["https://example.com/job/1", "https://example.com/job/2"] },
      ],
      getVacancyDetails: getVacancyDetailsMock,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(2)
  })

  it("respects limit from criteria", async () => {
    const getVacancyDetailsMock = vi
      .fn<JobSite["getVacancyDetails"]>()
      .mockResolvedValue(makeDetails())
    const provider = makeProvider({
      pages: [
        { urls: ["url1", "url2", "url3", "url4", "url5"], nextPageId: "p2" },
      ],
      getVacancyDetails: getVacancyDetailsMock,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: { ...CRITERIA, limit: 2 },
      onResult: (d) => results.push(d),
    })

    expect(getVacancyDetailsMock).toHaveBeenCalledTimes(2)
  })

  it("stops on abort signal", async () => {
    const controller = new AbortController()
    const provider = makeProvider({
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
      providers: [provider],
      browser: new BrowserStub(),
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
    const provider = makeProvider({
      getVacancyList: getVacancyListMock,
      supportedModes: ["apprenticeship"],
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
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
    const provider = makeProvider({
      pages: [{ urls: ["url1"] }],
      getVacancyList: getVacancyListMock,
      supportedModes: ["employment"],
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
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
    const provider = makeProvider({ getVacancyList: getVacancyListMock })

    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
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
    const provider1 = makeProvider({
      name: "failing-site",
      getVacancyList: vi
        .fn<JobSite["getVacancyList"]>()
        .mockRejectedValue(new Error("network error")),
      getVacancyDetails: vi.fn<JobSite["getVacancyDetails"]>(),
    })
    const provider2 = makeProvider({
      pages: [{ urls: ["url1"] }],
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider1, provider2],
      browser: new BrowserStub(),
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
    const provider = makeProvider({
      pages: [{ urls: ["url1", "url2"] }],
      getVacancyDetails: getVacancyDetailsMock,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider],
      browser: new BrowserStub(),
      criteria: CRITERIA,
      onResult: (d) => results.push(d),
    })

    expect(results.length).toBe(1)
    expect(results[0].url).toBe("url2")
  })

  it("processes multiple sites sequentially", async () => {
    const details1 = makeDetails({ url: "url1", company: "A" })
    const details2 = makeDetails({ url: "url2", company: "B" })
    const provider1 = makeProvider({
      pages: [{ urls: ["url1"] }],
      details: details1,
    })
    const provider2 = makeProvider({
      name: "site2",
      pages: [{ urls: ["url2"] }],
      details: details2,
    })

    const results: VacancyDetails[] = []
    const crawler = new SiteCrawler()
    await crawler.crawl({
      providers: [provider1, provider2],
      browser: new BrowserStub(),
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

function makeProvider(overrides: MakeProviderOptions = {}): JobSiteProvider {
  const provider: JobSiteProvider = {
    id: "test",
    name: "test-site",
    supportedModes: ["employment"],
    createScraper: () => ({
      getVacancyList: createVacancyListMock(overrides.pages),
      getVacancyDetails: createVacancyDetailsMock(overrides.details),
    }),
  }

  if (overrides.name) {
    provider.name = overrides.name
  }
  if (overrides.supportedModes) {
    provider.supportedModes = overrides.supportedModes
  }
  if (overrides.getVacancyList) {
    provider.createScraper = () => ({
      getVacancyList: overrides.getVacancyList,
      getVacancyDetails: createVacancyDetailsMock(overrides.details),
    })
  }
  if (overrides.getVacancyDetails) {
    provider.createScraper = () => ({
      getVacancyList: createVacancyListMock(overrides.pages),
      getVacancyDetails: overrides.getVacancyDetails,
    })
  }

  return provider
}

type MakeProviderOptions = {
  name?: string
  supportedModes?: JobSiteProvider["supportedModes"]
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
    address: new Address(),
    descriptionHtml: "",
    startDate: { value: "" },
    publishedAt: { value: "" },
    contact: { name: "", email: "", phone: "" },
    ...overrides,
  }
}
