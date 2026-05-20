import type {
  JobSite,
  JobSiteProvider,
  VacancyDetails,
  SearchCriteria,
} from "@/plugins/job-site"
import type { Browser } from "@/plugins/browser"
import type { JobSearchCriteria } from "@/models/job-search"
import type { ProgressEvent } from "@/models/progress/index.js"
import { formatError } from "@/services/vacancy-scanner/index.js"
import {
  resolveEffectiveMode,
  derivePluginCriteria,
  fetchSearchPage,
  collectNewUrls,
  sliceToLimit,
  shouldContinuePaging,
} from "./paginate.js"

export class SiteCrawler {
  async crawl(options: CrawlOptions): Promise<CrawlSummary> {
    const allUrls = new Set<string>()

    for (const provider of options.providers) {
      if (options.signal?.aborted) break
      await this.crawlSite(provider, options, allUrls)
    }

    return { totalUrls: allUrls.size }
  }

  private async crawlSite(
    provider: JobSiteProvider,
    options: CrawlOptions,
    allUrls: Set<string>,
  ): Promise<void> {
    const effectiveMode = resolveEffectiveMode(
      provider.supportedModes,
      options.criteria.mode,
    )
    if (!effectiveMode) return

    options.onProgress?.({
      message: `Scanning ${provider.name}...`,
      phase: "search",
    })

    const scraper = provider.createScraper(options.browser)
    const siteUrls = new Set<string>()
    const pluginCriteria = derivePluginCriteria(options.criteria, effectiveMode)
    let pageId: string | undefined

    for (let page = 0; page < 20; page++) {
      if (options.signal?.aborted) break
      const next = await this.crawlPage(
        scraper,
        provider.name,
        pluginCriteria,
        effectiveMode,
        pageId,
        page,
        siteUrls,
        allUrls,
        options,
      )
      if (!next) break
      pageId = next
    }
  }

  private async crawlPage(
    scraper: JobSite,
    siteName: string,
    pluginCriteria: SearchCriteria,
    effectiveMode: string,
    pageId: string | undefined,
    page: number,
    siteUrls: Set<string>,
    allUrls: Set<string>,
    options: CrawlOptions,
  ): Promise<string | undefined> {
    const listResult = await fetchSearchPage(
      scraper,
      siteName,
      pluginCriteria,
      pageId,
      page + 1,
    )
    if (!listResult) return undefined

    const newUrls = collectNewUrls(listResult.urls, siteUrls, allUrls)
    if (newUrls.length === 0) return undefined

    options.onProgress?.({
      message: `[${siteName}] Search (${effectiveMode}) page ${page + 1}: ${siteUrls.size} URLs found`,
      phase: "search",
    })

    const urlsToProcess = sliceToLimit(
      newUrls,
      siteUrls.size,
      options.criteria.limit,
    )
    await this.processUrls(scraper, siteName, urlsToProcess, options)

    if (
      !shouldContinuePaging(
        listResult.nextPageId,
        siteUrls.size,
        options.criteria.limit,
      )
    ) {
      return undefined
    }
    return listResult.nextPageId
  }

  private async processUrls(
    scraper: JobSite,
    siteName: string,
    urls: string[],
    options: CrawlOptions,
  ): Promise<void> {
    for (const url of urls) {
      if (options.signal?.aborted) break
      await this.fetchAndEmit(scraper, siteName, url, options)
    }
  }

  private async fetchAndEmit(
    scraper: JobSite,
    siteName: string,
    url: string,
    options: CrawlOptions,
  ): Promise<void> {
    let details
    try {
      details = await scraper.getVacancyDetails(url)
    } catch (error) {
      console.error(
        `[${siteName}] Failed to extract ${url}:`,
        formatError(error),
      )
      options.onProgress?.({
        message: `[${siteName}] Failed to extract ${url}`,
        phase: "scan",
      })
      return
    }
    options.onResult(details, siteName)
  }
}

interface CrawlOptions {
  providers: JobSiteProvider[]
  browser: Browser
  criteria: JobSearchCriteria
  signal?: AbortSignal
  onProgress?: (event: ProgressEvent) => void
  onResult: (details: VacancyDetails, siteName: string) => void
}

interface CrawlSummary {
  totalUrls: number
}
