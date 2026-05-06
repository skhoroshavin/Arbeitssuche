import { Vacancy } from "@/models/vacancy/index.js"
import type { NotFoundActivity } from "@/models/vacancy"

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
