import type { VacancyDetails } from "@/plugins/job-site/types.js"
import { Vacancy } from "@/models/vacancy/index.js"
import type {
  FoundActivity,
  NotFoundActivity,
  VacancyContact,
} from "@/models/vacancy/types.js"
import { vacancyHash } from "./vacancy-hash.js"
import { htmlToMarkdown } from "./markdown.js"
import { mergeAddresses } from "./extract-contact.js"

export interface ProcessOneResult {
  vacancy: Vacancy
  hash: string
  isNew: boolean
  descriptionChanged: boolean
}

export function processOneCrawlResult(
  details: VacancyDetails,
  siteName: string,
  existingByHash: Map<string, Vacancy>,
  crawlDate: string,
): ProcessOneResult {
  const hash = vacancyHash(
    details.title,
    details.company,
    details.address,
    details.contact?.name,
  )

  const contact = contactFromDetails(details)
  const description = details.descriptionHtml
    ? htmlToMarkdown(details.descriptionHtml)
    : undefined

  const foundActivity: FoundActivity = {
    type: "found",
    date: crawlDate,
    site: siteName,
    url: details.url,
    description,
    contact,
  }

  const existing = existingByHash.get(hash)

  if (existing) {
    return mergeWithExisting(
      existing,
      details,
      hash,
      foundActivity,
      contact,
      description,
    )
  }

  const vacancy = new Vacancy({
    hash,
    title: details.title,
    company: details.company,
    urls: [details.url],
    addresses: details.address ? [details.address] : [],
    contact,
    startDate: details.startDate,
    description,
    descriptionChanged: false,
    activityHistory: [foundActivity],
    active: true,
  })

  return { vacancy, hash, isNew: true, descriptionChanged: false }
}

export function markUnseenAsGone(
  allVacancies: Vacancy[],
  seenHashes: Set<string>,
  crawlDate: string,
): MarkUnseenResult {
  let goneCount = 0
  const vacancies = allVacancies.map((v) => {
    if (seenHashes.has(v.hash) || !v.active) return v

    goneCount++
    const notFoundActivity: NotFoundActivity = {
      type: "not-found",
      date: crawlDate,
      site: "all",
    }
    return v.with({
      active: false,
      activityHistory: [...v.activityHistory, notFoundActivity],
    })
  })

  return { vacancies, goneCount }
}

interface MarkUnseenResult {
  vacancies: Vacancy[]
  goneCount: number
}

function contactFromDetails(
  details: VacancyDetails,
): VacancyContact | undefined {
  if (!details.contact) return undefined
  const { name, email, phone } = details.contact
  if (!name && !email && !phone) return undefined
  return { name, email, phone }
}

function mergeWithExisting(
  existing: Vacancy,
  details: VacancyDetails,
  hash: string,
  foundActivity: FoundActivity,
  contact?: VacancyContact,
  description?: string,
): ProcessOneResult {
  const descriptionChanged = hasDescriptionChanged(
    description,
    existing.description,
  )

  const vacancy = existing.with({
    urls: mergeUrls(existing.urls, details.url),
    addresses: mergeAddresses(
      existing.addresses,
      details.address ? [details.address] : [],
    ),
    description: description ?? existing.description,
    descriptionChanged,
    contact: contact ?? existing.contact,
    startDate: details.startDate ?? existing.startDate,
    activityHistory: [...existing.activityHistory, foundActivity],
    active: true,
  })

  return { vacancy, hash, isNew: false, descriptionChanged }
}

function mergeUrls(existing: string[], newUrl: string): string[] {
  return existing.includes(newUrl) ? existing : [...existing, newUrl]
}

function hasDescriptionChanged(
  newDesc?: string,
  existingDesc?: string,
): boolean {
  return !!newDesc && !!existingDesc && newDesc !== existingDesc
}
