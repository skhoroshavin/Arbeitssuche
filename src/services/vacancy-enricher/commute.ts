import type { CommuteClient } from "@/plugins/commute/types.js"
import type { Vacancy } from "@/models/vacancy/index.js"
import { formatError } from "@/services/vacancy-scanner/index.js"

export async function computeCommutes(
  input: ComputeCommutesInput,
): Promise<ComputeCommutesOutput> {
  const { vacancies, origin, commuteClient, signal, onProgress } = input

  const needsCommute = vacancies.filter(
    (v) => v.active && v.addresses.some((addr) => !(addr in v.commute)),
  )

  let computedCount = 0
  let errorCount = 0
  const total = needsCommute.length
  const updatedMap = new Map<string, Vacancy>()

  for (const [index, vacancy] of needsCommute.entries()) {
    if (signal?.aborted) break

    onProgress?.(
      `Computing commute for "${vacancy.title}" (${index + 1}/${total})`,
      index + 1,
      total,
    )

    const result = await computeSingleVacancyCommute(
      vacancy,
      origin,
      commuteClient,
    )
    errorCount += result.errors

    if (result.computed) {
      updatedMap.set(vacancy.hash, vacancy.with({ commute: result.commute }))
      computedCount++
    }
  }

  const mapped = vacancies.map((v) => updatedMap.get(v.hash) ?? v)
  const skippedCount = vacancies.length - needsCommute.length

  return { vacancies: mapped, computedCount, skippedCount, errorCount }
}

interface ComputeCommutesInput {
  vacancies: Vacancy[]
  origin: string
  commuteClient: CommuteClient
  signal?: AbortSignal
  onProgress?: (message: string, current: number, total: number) => void
}

interface ComputeCommutesOutput {
  vacancies: Vacancy[]
  computedCount: number
  skippedCount: number
  errorCount: number
}

async function computeSingleVacancyCommute(
  vacancy: Vacancy,
  origin: string,
  commuteClient: CommuteClient,
) {
  const commute = { ...vacancy.commute }
  let computed = false
  let errors = 0

  for (const address of vacancy.addresses) {
    if (address in commute) continue

    try {
      commute[address] = await commuteClient.getCommute(origin, address)
      computed = true
    } catch (error) {
      console.error(
        `Commute error for "${vacancy.title}" → "${address}":`,
        formatError(error),
      )
      errors++
    }
  }

  return { commute, computed, errors }
}
