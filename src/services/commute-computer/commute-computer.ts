import type { CommuteClient } from "@/plugins/commute"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { Applicant } from "@/models/applicant"
import { formatError } from "@/utils"

export class CommuteComputer {
  constructor(private readonly commuteClient?: CommuteClient) {}

  async compute(
    vacancies: Vacancy[],
    applicant: Applicant,
    signal?: AbortSignal,
  ): Promise<Vacancy[]> {
    if (!this.commuteClient) return vacancies

    const origin = resolveCommuteOrigin(applicant)
    if (!origin) return vacancies

    const output = await computeCommutes({
      vacancies,
      origin,
      commuteClient: this.commuteClient,
      signal,
    })

    return output.vacancies
  }
}

interface ComputeCommutesInput {
  vacancies: Vacancy[]
  origin: string
  commuteClient: CommuteClient
  signal?: AbortSignal
}

interface ComputeCommutesOutput {
  vacancies: Vacancy[]
  computedCount: number
  skippedCount: number
  errorCount: number
}

async function computeCommutes(
  input: ComputeCommutesInput,
): Promise<ComputeCommutesOutput> {
  const { vacancies, origin, commuteClient, signal } = input

  const needsCommute = vacancies.filter(
    (v) => v.active && v.addresses.some((addr) => !(addr in v.commute)),
  )

  let computedCount = 0
  let errorCount = 0
  const updatedMap = new Map<string, Vacancy>()

  for (const vacancy of needsCommute) {
    if (signal?.aborted) break

    const result = await computeSingleVacancyCommute(
      vacancy,
      origin,
      commuteClient,
      signal,
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

async function computeSingleVacancyCommute(
  vacancy: Vacancy,
  origin: string,
  commuteClient: CommuteClient,
  signal?: AbortSignal,
) {
  const commute = { ...vacancy.commute }
  let computed = false
  let errors = 0

  for (const address of vacancy.addresses) {
    if (address in commute) continue
    if (signal?.aborted) break

    try {
      commute[address] = await commuteClient.getCommute(origin, address, signal)
      computed = true
    } catch (error) {
      rethrowIfAborted(error)
      console.error(
        `Commute error for "${vacancy.title}" → "${address}":`,
        formatError(error),
      )
      errors++
    }
  }

  return { commute, computed, errors }
}

function rethrowIfAborted(error: unknown): void {
  if (error instanceof DOMException && error.name === "AbortError") throw error
}

function resolveCommuteOrigin(applicant: Applicant): string | undefined {
  const address = applicant.personal.address
  if (!address) return undefined
  return `${address.street}, ${address.zip} ${address.city}`
}
