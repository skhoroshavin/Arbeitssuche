import { Vacancy } from "@/models/vacancy/index.js"

export function markUnseenAsGone(
  allVacancies: Vacancy[],
  seenHashes: Set<string>,
  crawlDate: string,
): MarkUnseenResult {
  let goneCount = 0
  const vacancies = allVacancies.map((v) => {
    if (seenHashes.has(v.hash) || !v.active) return v

    v.markNotFound(crawlDate)
    goneCount++
    return v
  })

  return { vacancies, goneCount }
}

interface MarkUnseenResult {
  vacancies: Vacancy[]
  goneCount: number
}

interface MarkUnseenResult {
  vacancies: Vacancy[]
  goneCount: number
}
