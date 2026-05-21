import type { VacancyDetails } from "@/plugins/job-site"
import { Vacancy } from "@/models/vacancy/index.js"
import type { FoundActivity, VacancyContact } from "@/models/vacancy"
import { VacancyAddress } from "@/models/vacancy"
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
    details.address.format(),
    details.contact.name,
  )

  const contact = details.contact
  const description = details.descriptionHtml
    ? htmlToMarkdown(details.descriptionHtml)
    : ""

  const foundActivity: FoundActivity = {
    type: "found",
    date: crawlDate,
    site: siteName,
    url: details.url,
    description,
    contact,
    notes: "",
  }

  const existing = existingByHash.get(hash)

  if (existing) {
    return mergeWithExisting(existing, details, hash, foundActivity, description)
  }

  const vacancy = new Vacancy()
  vacancy.hash = hash
  vacancy.title = details.title
  vacancy.company = details.company
  vacancy.addresses = details.address.isValid()
    ? [VacancyAddress.fromString(details.address.format())]
    : []
  vacancy.contact = contact
  vacancy.startDate = details.startDate.value
  vacancy.description = description
  vacancy.enriched = false
  vacancy.enrichmentDirty = true
  vacancy.activityHistory = [foundActivity]
  vacancy.active = true

  return { vacancy, hash, isNew: true }
}

function mergeWithExisting(
  existing: Vacancy,
  details: VacancyDetails,
  hash: string,
  foundActivity: FoundActivity,
  description: string,
): ProcessResult {
  const descriptionChanged = hasDescriptionChanged(
    description,
    existing.description,
  )

  existing.addresses = mergeAddresses(
    existing.addresses,
    details.address.isValid()
      ? [VacancyAddress.fromString(details.address.format())]
      : [],
  )
  existing.description = description || existing.description
  existing.enrichmentDirty = existing.enrichmentDirty || descriptionChanged
  if (hasContact(details.contact)) {
    existing.contact = details.contact
  }
  existing.startDate = details.startDate.value || existing.startDate
  existing.addActivity(foundActivity)
  existing.active = true

  return { vacancy: existing, hash, isNew: false }
}

interface ProcessResult {
  vacancy: Vacancy
  hash: string
  isNew: boolean
}

export function mergeAddresses(
  existing: VacancyAddress[],
  extracted: VacancyAddress[],
): VacancyAddress[] {
  const merged = [...existing]
  const mergedLower = merged.map((a) => a.format().toLowerCase())

  for (const newAddr of extracted) {
    const newLower = newAddr.format().toLowerCase()

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

function hasDescriptionChanged(newDesc: string, existingDesc: string): boolean {
  return (
    newDesc.length > 0 && existingDesc.length > 0 && newDesc !== existingDesc
  )
}

function hasContact(contact: VacancyContact): boolean {
  return (
    contact.name.trim().length > 0 ||
    contact.email.trim().length > 0 ||
    contact.phone.trim().length > 0
  )
}
