import type { VacancyDetails } from "@/plugins/job-site/types.js"
import { Vacancy } from "@/models/vacancy/index.js"
import type { FoundActivity, VacancyContact } from "@/models/vacancy/types.js"
import { vacancyHash } from "./vacancy-hash.js"
import { htmlToMarkdown } from "./markdown.js"

export function process(
  details: VacancyDetails,
  siteName: string,
  existingByHash: Map<string, Vacancy>,
  crawlDate: string,
): ProcessResult {
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
    enriched: false,
    enrichmentDirty: true,
    activityHistory: [foundActivity],
    active: true,
  })

  return { vacancy, hash, isNew: true }
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
): ProcessResult {
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
    enrichmentDirty: existing.enrichmentDirty || descriptionChanged,
    contact: contact ?? existing.contact,
    startDate: details.startDate ?? existing.startDate,
    activityHistory: [...existing.activityHistory, foundActivity],
    active: true,
  })

  return { vacancy, hash, isNew: false }
}

interface ProcessResult {
  vacancy: Vacancy
  hash: string
  isNew: boolean
}

function mergeUrls(existing: string[], newUrl: string): string[] {
  return existing.includes(newUrl) ? existing : [...existing, newUrl]
}

export function mergeAddresses(
  existing: string[],
  extracted: string[],
): string[] {
  const merged = [...existing]
  const mergedLower = merged.map((a) => a.toLowerCase())

  for (const newAddr of extracted) {
    const newLower = newAddr.toLowerCase()

    const subsumesIndex = mergedLower.findIndex(
      (lower) => lower !== newLower && newLower.includes(lower),
    )

    if (subsumesIndex === -1) {
      const alreadyCovered = mergedLower.some(
        (lower) => lower === newLower || lower.includes(newLower),
      )
      if (!alreadyCovered) {
        merged.push(newAddr)
        mergedLower.push(newLower)
      }
    } else {
      merged[subsumesIndex] = newAddr
      mergedLower[subsumesIndex] = newLower
    }
  }

  return merged
}

function hasDescriptionChanged(
  newDesc?: string,
  existingDesc?: string,
): boolean {
  return !!newDesc && !!existingDesc && newDesc !== existingDesc
}
