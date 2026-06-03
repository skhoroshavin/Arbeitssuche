import { z } from "zod"

import {
  VacancyAddress,
  CommuteInfo,
  CommuteInfoSchema,
} from "./vacancy-address.js"

export type ActivityType =
  | "found"
  | "not-found"
  | "applied"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested"

export class Vacancy {
  hash = ""
  title = ""
  company = ""
  addresses: VacancyAddress[] = []
  contact: VacancyContact = { name: "", email: "", phone: "" }
  startDate = ""
  description = ""
  enriched = false
  enrichmentDirty = false
  summary = ""
  matchScore: MatchScore = "unknown"
  activityHistory: Activity[] = []
  active = true
  coverLetter = ""

  static hashForDiscovery(discovery: VacancyDiscovery): string {
    const key = [
      discovery.title,
      discovery.company,
      discovery.address,
      discovery.contact.name,
    ]
      .map((s) => s.trim().toLowerCase())
      .join("||")
    return simpleHash(key)
  }

  static fromDiscovery(discovery: VacancyDiscovery): Vacancy {
    const vacancy = new Vacancy()
    vacancy.hash = Vacancy.hashForDiscovery(discovery)
    vacancy.title = discovery.title
    vacancy.company = discovery.company
    vacancy.addresses = discovery.address.trim()
      ? [VacancyAddress.fromString(discovery.address)]
      : []
    vacancy.contact = { ...discovery.contact }
    vacancy.startDate = discovery.startDate
    vacancy.description = discovery.description
    vacancy.enriched = false
    vacancy.enrichmentDirty = true
    vacancy.activityHistory = [Vacancy.createFoundActivity(discovery)]
    vacancy.active = true
    return vacancy
  }

  mergeDiscovery(discovery: VacancyDiscovery): void {
    const descriptionChanged = hasDescriptionChanged(
      discovery.description,
      this.description,
    )

    this.addresses = mergeAddresses(
      this.addresses,
      discovery.address.trim()
        ? [VacancyAddress.fromString(discovery.address)]
        : [],
    )

    this.description = discovery.description || this.description
    this.enrichmentDirty = this.enrichmentDirty || descriptionChanged
    if (hasContact(discovery.contact)) {
      this.contact = { ...discovery.contact }
    }
    this.startDate = discovery.startDate || this.startDate

    if (!this.active) {
      this.active = true
    }

    this.activityHistory.push(Vacancy.createFoundActivity(discovery))
  }

  recordActivity(activity: Activity): void {
    if (activity.type === "found" || activity.type === "not-found") {
      throw new Error(`Cannot record "${activity.type}" directly`)
    }
    this.activityHistory.push(activity)
  }

  updateCoverLetter(content: string): void {
    this.coverLetter = content
  }

  markNotFound(crawlDate: string): void {
    if (!this.active) return
    this.activityHistory.push({
      type: "not-found",
      date: crawlDate,
      site: "all",
      notes: "",
    })
    this.active = false
  }

  private static createFoundActivity(
    discovery: VacancyDiscovery,
  ): FoundActivity {
    return {
      type: "found",
      date: discovery.crawlDate,
      site: discovery.site,
      url: discovery.url,
      description: discovery.description,
      contact: { ...discovery.contact },
      notes: "",
    }
  }

  static parse(data: unknown): Vacancy {
    const parsed = VacancyInputSchema.parse(data)
    const vacancy = new Vacancy()
    vacancy.hash = parsed.hash
    vacancy.title = parsed.title
    vacancy.company = parsed.company
    vacancy.addresses = parsed.addresses.map((a) =>
      typeof a === "string"
        ? VacancyAddress.fromString(a)
        : VacancyAddress.parse(a),
    )
    vacancy.contact = parsed.contact
    vacancy.startDate = parsed.startDate
    vacancy.description = parsed.description
    vacancy.enriched = parsed.enriched
    vacancy.enrichmentDirty = parsed.enrichmentDirty
    vacancy.summary = parsed.summary
    vacancy.matchScore = parsed.matchScore
    vacancy.activityHistory = parsed.activityHistory
    vacancy.active = parsed.active
    vacancy.coverLetter = parsed.coverLetter

    if (parsed.commute) {
      for (const [key, value] of Object.entries(parsed.commute)) {
        const addr = vacancy.addresses.find((a) => a.format() === key)
        if (addr) {
          addr.commute = value
        }
      }
    }

    return vacancy
  }

  get status(): VacancyStatus {
    const userActivities = this.activityHistory.filter(
      (a) => a.type !== "found" && a.type !== "not-found",
    )

    if (userActivities.length === 0) {
      return deriveStatusNoUserActivity(this.activityHistory, this.active)
    }

    const types = new Set(userActivities.map((a) => a.type))
    return deriveStatusFromHistory(types, this.active)
  }

  get sources(): VacancySource[] {
    const seen = new Set<string>()
    const sources: VacancySource[] = []

    for (const activity of this.activityHistory) {
      if (activity.type !== "found") continue
      const key = `${activity.site}\0${activity.url}`
      if (seen.has(key)) continue
      seen.add(key)
      sources.push({ site: activity.site, url: activity.url })
    }

    return sources
  }

  getMinCommuteMinutes(): number | undefined {
    const infos = this.addresses
      .map((a) => a.commute)
      .filter((c): c is CommuteInfo => !!c)
    if (infos.length === 0) return undefined
    return Math.min(...infos.map((info) => info.durations.morning))
  }

  getLatestActivityDate(): string {
    return this.activityHistory.at(-1)?.date ?? ""
  }
}

export interface VacancyDiscovery {
  site: string
  url: string
  crawlDate: string
  title: string
  company: string
  address: string
  contact: VacancyContact
  description: string
  startDate: string
}

export type VacancyStatus =
  | "new"
  | "gone"
  | "renewed"
  | "applied"
  | "ignored"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested"

export interface VacancySource {
  site: string
  url: string
}

export type MatchScore =
  | "very-bad"
  | "bad"
  | "ok"
  | "good"
  | "excellent"
  | "unknown"

export type Activity =
  | FoundActivity
  | NotFoundActivity
  | AppliedActivity
  | InvitedActivity
  | InterviewedActivity
  | OfferedActivity
  | RejectedActivity
  | NotInterestedActivity

export interface FoundActivity extends BaseActivity {
  type: "found"
  site: string
  url: string
  description: string
  contact: VacancyContact
}

export interface VacancyContact {
  name: string
  email: string
  phone: string
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

interface NotFoundActivity extends BaseActivity {
  type: "not-found"
  site: string
}

interface AppliedActivity extends BaseActivity {
  type: "applied"
}

interface InvitedActivity extends BaseActivity {
  type: "invited"
  interviewDate: string
}

interface InterviewedActivity extends BaseActivity {
  type: "interviewed"
  outcome: "completed" | "cancelled"
}

interface OfferedActivity extends BaseActivity {
  type: "offered"
  startDate: string
  salary: string
}

interface RejectedActivity extends BaseActivity {
  type: "rejected"
}

interface NotInterestedActivity extends BaseActivity {
  type: "not-interested"
}

interface BaseActivity {
  date: string
  notes: string
}

function deriveStatusNoUserActivity(
  activityHistory: Activity[],
  active: boolean,
): VacancyStatus {
  if (!active) return "gone"
  const wasGone = activityHistory.some((a) => a.type === "not-found")
  return wasGone ? "renewed" : "new"
}

function deriveStatusFromHistory(
  types: Set<string>,
  active: boolean,
): VacancyStatus {
  const STATUS_PRIORITY = [
    "rejected",
    "offered",
    "interviewed",
    "invited",
  ] as const
  const match = STATUS_PRIORITY.find((t) => types.has(t))
  if (match) return match

  if (types.has("applied")) return active ? "applied" : "ignored"
  if (types.has("not-interested")) return "not-interested"
  return active ? "new" : "gone"
}

const VacancyContactSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
})

const VacancySourceSchema = z.object({
  site: z.string(),
  url: z.string(),
})

export const VacancySerializedSchema = z.object({
  hash: z.string(),
  title: z.string(),
  company: z.string(),
  addresses: z.array(z.unknown()),
  contact: VacancyContactSchema,
  startDate: z.string(),
  description: z.string(),
  enriched: z.boolean(),
  enrichmentDirty: z.boolean(),
  summary: z.string(),
  matchScore: z.string(),
  activityHistory: z.array(z.unknown()),
  active: z.boolean(),
  coverLetter: z.string(),
  status: z.string(),
  sources: z.array(VacancySourceSchema),
})

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

/** Deterministic 6-char hex hash for browser/Node compatibility */
function simpleHash(input: string): string {
  let hash = 0
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0
    hash = (hash << 5) - hash + code
    hash = Math.trunc(hash)
  }
  return (hash >>> 0).toString(16).slice(0, 6).padStart(6, "0")
}

const ActivitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("found"),
    date: z.string(),
    notes: z.string(),
    site: z.string(),
    url: z.string(),
    description: z.string(),
    contact: VacancyContactSchema,
  }),
  z.object({
    type: z.literal("not-found"),
    date: z.string(),
    notes: z.string(),
    site: z.string(),
  }),
  z.object({
    type: z.literal("applied"),
    date: z.string(),
    notes: z.string(),
  }),
  z.object({
    type: z.literal("invited"),
    date: z.string(),
    notes: z.string(),
    interviewDate: z.string(),
  }),
  z.object({
    type: z.literal("interviewed"),
    date: z.string(),
    notes: z.string(),
    outcome: z.enum(["completed", "cancelled"]),
  }),
  z.object({
    type: z.literal("offered"),
    date: z.string(),
    notes: z.string(),
    startDate: z.string(),
    salary: z.string(),
  }),
  z.object({
    type: z.literal("rejected"),
    date: z.string(),
    notes: z.string(),
  }),
  z.object({
    type: z.literal("not-interested"),
    date: z.string(),
    notes: z.string(),
  }),
])

const VacancyInputSchema = z
  .object({
    hash: z.string().default(""),
    title: z.string().default(""),
    company: z.string().default(""),
    urls: z.array(z.string()).optional(),
    addresses: z.array(z.union([z.string(), z.unknown()])).default([]),
    contact: VacancyContactSchema.default({ name: "", email: "", phone: "" }),
    startDate: z.string().default(""),
    description: z.string().default(""),
    enriched: z.boolean().default(false),
    enrichmentDirty: z.boolean().default(false),
    summary: z.string().default(""),
    matchScore: z
      .enum(["very-bad", "bad", "ok", "good", "excellent", "unknown"])
      .default("unknown"),
    commute: z.record(z.string(), CommuteInfoSchema).optional(),
    activityHistory: z.array(ActivitySchema).default([]),
    active: z.boolean().default(true),
    coverLetter: z.string().default(""),
  })
  .passthrough()
