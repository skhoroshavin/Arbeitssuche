import type { JobSite, SearchCriteria } from "@/plugins/job-site"
import type { JobSearchCriteria } from "@/models/job-search"
import type { ProgressEvent } from "@/models/progress/index.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import { formatError } from "@/utils"
import {
  resolveEffectiveMode,
  derivePluginCriteria,
  fetchSearchPage,
  collectNewUrls,
  sliceToLimit,
  shouldContinuePaging,
} from "./paginate.js"
import { process as processVacancyDetails } from "./process.js"

export class SiteCrawler {
  async crawl(options: CrawlOptions): Promise<CrawlSummary> {
    const allUrls = new Set<string>()

    for (const site of options.sites) {
      if (options.signal?.aborted) break
      await this.crawlSite(site, options, allUrls)
    }

    return { totalUrls: allUrls.size }
  }

  private async crawlSite(
    site: JobSite,
    options: CrawlOptions,
    allUrls: Set<string>,
  ): Promise<void> {
    const effectiveMode = resolveEffectiveMode(site, options.criteria.mode)
    if (!effectiveMode) return

    options.onProgress?.({
      message: `Scanning ${site.name}...`,
      phase: "search",
    })

    const siteUrls = new Set<string>()
    const pluginCriteria = derivePluginCriteria(options.criteria, effectiveMode)
    let pageId: string | undefined

    for (let page = 0; page < 20; page++) {
      if (options.signal?.aborted) break
      const next = await this.crawlPage(
        site,
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
    site: JobSite,
    pluginCriteria: SearchCriteria,
    effectiveMode: string,
    pageId: string | undefined,
    page: number,
    siteUrls: Set<string>,
    allUrls: Set<string>,
    options: CrawlOptions,
  ): Promise<string | undefined> {
    const listResult = await fetchSearchPage(
      site,
      pluginCriteria,
      pageId,
      page + 1,
    )
    if (!listResult) return undefined

    const newUrls = collectNewUrls(listResult.urls, siteUrls, allUrls)
    if (newUrls.length === 0) return undefined

    options.onProgress?.({
      message: `[${site.name}] Search (${effectiveMode}) page ${page + 1}: ${siteUrls.size} URLs found`,
      phase: "search",
    })

    const urlsToProcess = sliceToLimit(
      newUrls,
      siteUrls.size,
      options.criteria.limit,
    )
    await this.processUrls(site, urlsToProcess, options)

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
    site: JobSite,
    urls: string[],
    options: CrawlOptions,
  ): Promise<void> {
    for (const url of urls) {
      if (options.signal?.aborted) break
      await this.fetchAndEmit(site, url, options)
    }
  }

  private async fetchAndEmit(
    site: JobSite,
    url: string,
    options: CrawlOptions,
  ): Promise<void> {
    let details
    try {
      details = await site.getVacancyDetails(url)
    } catch (error) {
      console.error(
        `[${site.name}] Failed to extract ${url}:`,
        formatError(error),
      )
      options.onProgress?.({
        message: `[${site.name}] Failed to extract ${url}`,
        phase: "scan",
      })
      return
    }
    const result = processVacancyDetails(
      details,
      site.name,
      options.existingByHash,
      options.crawlDate,
    )
    options.onResult({ ...result, siteName: site.name })
  }
}

interface CrawlOptions {
  sites: JobSite[]
  criteria: JobSearchCriteria
  signal?: AbortSignal
  onProgress?: (event: ProgressEvent) => void
  onResult: (result: {
    vacancy: Vacancy
    hash: string
    isNew: boolean
    siteName: string
  }) => void
  existingByHash: Map<string, Vacancy>
  crawlDate: string
}

interface CrawlSummary {
  totalUrls: number
}
