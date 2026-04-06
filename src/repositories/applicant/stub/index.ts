import {
  type ApplicantPersonal,
  type Applicant,
  type ApplicantInfo,
} from "@/models/applicant/types.js"
import {
  DEFAULT_APPLICANT,
  resolveApplicant,
} from "@/models/applicant/index.js"
import type { ApplicantRepository } from "@/repositories/applicant/types.js"
import { createUniqueDerivedId } from "@/utils/node/index.js"

export function createStubApplicantRepository(
  initial?: Record<string, Applicant>,
): ApplicantRepository {
  return new StubApplicantRepository(initial)
}

class StubApplicantRepository implements ApplicantRepository {
  constructor(initial?: Record<string, Applicant>) {
    this.store = new Map(initial ? Object.entries(initial) : [])
  }

  list(): ApplicantInfo[] {
    return [...this.store.values()].map((data) => ({
      id: data.id,
      name: data.personal.name,
    }))
  }

  exists(id: string): boolean {
    return this.store.has(id)
  }

  load(id: string): Applicant {
    return resolveApplicant(structuredClone(this.getOrThrow(id)))
  }

  save(id: string, data: Applicant): void {
    this.getOrThrow(id)
    this.store.set(id, resolveApplicant(structuredClone(data)))
  }

  create(name: string): string {
    const id = createUniqueDerivedId(name, (id) => this.store.has(id))
    const personal: ApplicantPersonal = {
      ...DEFAULT_APPLICANT.personal,
      name,
    }
    const data = resolveApplicant({ ...DEFAULT_APPLICANT, id, personal })
    this.store.set(id, data)
    return id
  }

  delete(id: string): void {
    this.store.delete(id)
  }

  private getOrThrow(id: string): Applicant {
    const data = this.store.get(id)
    if (!data) throw new Error(`Applicant "${id}" not found`)
    return data
  }

  private readonly store: Map<string, Applicant>
}
