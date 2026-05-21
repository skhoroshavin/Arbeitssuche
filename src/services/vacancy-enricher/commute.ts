import type { CommuteClient } from "@/plugins/commute"
import type { Vacancy } from "@/models/vacancy/index.js"
import { formatError } from "@/services/vacancy-scanner/index.js"

export async function computeCommutes(
  input: ComputeCommutesInput,
): Promise<ComputeCommutesOutput> {
  const { vacancies, origin, commuteClient, signal, onProgress } = input

  const needsCommute = vacancies.filter(
    (v) => v.active && v.addresses.some((addr) => !addr.commute),
  )

  let computedCount = 0
  let errorCount = 0
  const total = needsCommute.length

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
      signal,
    )
    errorCount += result.errors

    if (result.computed) {
      computedCount++
    }
  }

  const skippedCount = vacancies.length - needsCommute.length

  return { vacancies, computedCount, skippedCount, errorCount }
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
  signal?: AbortSignal,
) {
  let computed = false
  let errors = 0

  for (const address of vacancy.addresses) {
    if (address.commute) continue
    if (signal?.aborted) break

    try {
      address.commute = await commuteClient.getCommute(
        origin,
        address.format(),
        signal,
      )
      computed = true
    } catch (error) {
      rethrowAbortError(error)
      console.error(
        `Commute error for "${vacancy.title}" → "${address.format()}":`,
        formatError(error),
      )
      errors++
    }
  }

  return { computed, errors }
}

function rethrowAbortError(error: unknown): void {
  if (error instanceof DOMException && error.name === "AbortError") throw error
}
