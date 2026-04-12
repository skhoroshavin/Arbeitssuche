import type {
  VacancyDTO,
  Activity,
  CommuteInfo,
  MatchScore,
  VacancyContact,
  VacancySource,
  VacancyStatus,
} from "."
import { resolveVacancy } from "./resolve.js"

/** Rich domain object wrapping VacancyDTO with derived methods. */
export class Vacancy implements VacancyDTO {
  constructor(data: Partial<VacancyDTO>) {
    const merged = resolveVacancy(data)

    this.hash = merged.hash
    this.title = merged.title
    this.company = merged.company
    this.urls = merged.urls
    this.addresses = merged.addresses
    this.contact = merged.contact
    this.startDate = merged.startDate
    this.description = merged.description
    this.enriched = merged.enriched
    this.enrichmentDirty = merged.enrichmentDirty
    this.summary = merged.summary
    this.matchScore = merged.matchScore
    this.commute = merged.commute
    this.activityHistory = merged.activityHistory
    this.active = merged.active
  }

  readonly hash: string
  readonly title: string
  readonly company: string
  readonly urls: string[]
  readonly addresses: string[]
  readonly contact: VacancyContact
  readonly startDate: string
  readonly description: string
  readonly enriched: boolean
  readonly enrichmentDirty: boolean
  readonly summary: string
  readonly matchScore: MatchScore
  readonly commute: Record<string, CommuteInfo>
  readonly activityHistory: Activity[]
  readonly active: boolean

  /** Derive current status from activity history and active flag. */
  deriveStatus(): VacancyStatus {
    const userActivities = this.activityHistory.filter(
      (a) => a.type !== "found" && a.type !== "not-found",
    )

    if (userActivities.length === 0) {
      return deriveStatusNoUserActivity(this.activityHistory, this.active)
    }

    const types = new Set(userActivities.map((a) => a.type))
    return deriveStatusFromHistory(types, this.active)
  }

  /** Extract deduplicated sources from "found" activities. */
  deriveSources(): VacancySource[] {
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

  /** Minimum morning commute across all addresses in minutes, or undefined if none. */
  getMinCommuteMinutes(): number | undefined {
    const infos = Object.values(this.commute)
    if (infos.length === 0) return undefined
    return Math.min(...infos.map((info) => info.durations.morning))
  }

  /** Get date of the most recent activity, or empty string. */
  getLatestActivityDate(): string {
    const latestActivity = this.activityHistory.at(-1)
    return latestActivity?.date ?? ""
  }

  /** Create a new Vacancy with overridden fields. */
  with(overrides: Partial<VacancyDTO>): Vacancy {
    return new Vacancy({ ...this, ...overrides })
  }
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
