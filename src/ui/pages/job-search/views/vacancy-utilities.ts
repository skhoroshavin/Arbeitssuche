import type { Vacancy } from "@/models/vacancy"
import type { SortKey } from "./filter-bar"

export function getCommuteSummary(vacancy: Vacancy): string | undefined {
  const withCommute = vacancy.addresses.filter((a) => a.commute)
  if (withCommute.length === 0) return undefined
  const first = withCommute[0].commute
  if (!first) return undefined
  return `${first.durations.morning} min (${first.distance})`
}

export function compareVacancies(
  sortBy: SortKey,
  a: Vacancy,
  b: Vacancy,
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
  vacancy: Pick<Vacancy, "activityHistory">,
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

function getCommuteMorningMinutes(vacancy: Vacancy): number {
  const withCommute = vacancy.addresses.filter((a) => a.commute)
  if (withCommute.length === 0) return Number.POSITIVE_INFINITY
  const first = withCommute[0].commute
  if (!first) return Number.POSITIVE_INFINITY
  return first.durations.morning
}
