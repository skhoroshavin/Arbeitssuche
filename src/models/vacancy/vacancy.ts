import { z } from "zod"
import { VacancyAddress, CommuteInfo, CommuteInfoSchema } from "./vacancy-address.js"

export type ActivityType =
  | "found"
  | "not-found"
  | "applied"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested"

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

export interface VacancyContact {
  name: string
  email: string
  phone: string
}

export type MatchScore = "very-bad" | "bad" | "ok" | "good" | "excellent" | "unknown"

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

export interface NotFoundActivity extends BaseActivity {
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

  static parse(data: unknown): Vacancy {
    const parsed = VacancyInputSchema.parse(data)
    const vacancy = new Vacancy()
    vacancy.hash = parsed.hash
    vacancy.title = parsed.title
    vacancy.company = parsed.company
    vacancy.addresses = parsed.addresses.map((a) =>
      typeof a === "string" ? VacancyAddress.fromString(a) : VacancyAddress.parse(a),
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

    if (parsed.commute && typeof parsed.commute === "object") {
      for (const [key, value] of Object.entries(parsed.commute)) {
        const addr = vacancy.addresses.find((a) => a.format() === key)
        if (addr && value) {
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

  addActivity(activity: Activity): void {
    this.activityHistory.push(activity)
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

const VacancyContactSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
})

const VacancySourceSchema = z.object({
  site: z.string(),
  url: z.string(),
})

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
