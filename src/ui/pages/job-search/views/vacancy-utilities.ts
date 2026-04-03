import type { VacancyWithStatus } from "@/ui/data"
import type { SortKey } from "./filter-bar"

export function getCommuteSummary(
  vacancy: VacancyWithStatus,
): string | undefined {
  const values = Object.values(vacancy.commute)
  if (values.length === 0) return undefined
  const first = values[0]
  return `${first.durations.morning} min (${first.distance})`
}

export function compareVacancies(
  sortBy: SortKey,
  a: VacancyWithStatus,
  b: VacancyWithStatus,
): number {
  switch (sortBy) {
    case "company": {
      return a.company.localeCompare(b.company)
    }
    case "commute": {
      return getCommuteMorningMinutes(a) - getCommuteMorningMinutes(b)
    }
    case "score": {
      const scoreA = MATCH_SCORE_ORDER.indexOf(a.matchScore)
      const scoreB = MATCH_SCORE_ORDER.indexOf(b.matchScore)
      return scoreA - scoreB
    }
    default: {
      return getLatestActivityDate(b).localeCompare(getLatestActivityDate(a))
    }
  }
}

export function getLatestActivityDate(
  vacancy: Pick<VacancyWithStatus, "activityHistory">,
): string {
  return vacancy.activityHistory.at(-1)?.date ?? ""
}

const MATCH_SCORE_ORDER = [
  "excellent",
  "good",
  "ok",
  "bad",
  "very-bad",
] as const

function getCommuteMorningMinutes(vacancy: VacancyWithStatus): number {
  const values = Object.values(vacancy.commute)
  if (values.length === 0) return Number.POSITIVE_INFINITY
  return values[0].durations.morning
}
