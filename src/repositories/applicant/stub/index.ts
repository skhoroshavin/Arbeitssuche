import {
  type ApplicantID,
  type ApplicantInfo,
  Applicant,
  makeApplicantID,
} from "@/models/applicant"

import type { ApplicantRepository } from ".."

export function createStubApplicantRepository(
  initial?: Record<string, Applicant>,
): ApplicantRepository {
  return new StubApplicantRepository(initial)
}

class StubApplicantRepository implements ApplicantRepository {
  constructor(initial?: Record<string, Applicant>) {
    this.store = new Map(initial ? Object.entries(initial) : [])
    this.nextId = this.store.size
  }

  list(): ApplicantInfo[] {
    return [...this.store.entries()]
      .filter(([id]) => id !== DRAFT_SENTINEL)
      .map(([id, data]) => ({
        id: makeApplicantID(id),
        displayName: data.personal.name,
      }))
  }

  load(id: ApplicantID): Applicant {
    return Applicant.parse(structuredClone(this.getOrThrow(id)))
  }

  save(id: ApplicantID, data: Applicant): void {
    this.store.set(id.value, Applicant.parse(structuredClone(data)))
  }

  delete(id: ApplicantID): void {
    this.store.delete(id.value)
  }

  saveDraft(draft: Applicant): void {
    this.store.set(DRAFT_SENTINEL, Applicant.parse(structuredClone(draft)))
  }

  finalizeDraft(): ApplicantID {
    const draft = this.loadDraft()
    if (!draft) throw new Error("Applicant draft not found")
    const id = makeApplicantID(String(++this.nextId))
    this.store.set(id.value, Applicant.parse(structuredClone(draft)))
    this.deleteDraft()
    return id
  }

  loadDraft(): Applicant | undefined {
    const draft = this.store.get(DRAFT_SENTINEL)
    if (!draft) return undefined
    const parsed = Applicant.parse(structuredClone(draft))
    return parsed.isDifferentFromDefault() ? parsed : undefined
  }

  deleteDraft(): void {
    this.store.delete(DRAFT_SENTINEL)
  }

  private getOrThrow(id: ApplicantID): Applicant {
    const data = this.store.get(id.value)
    if (!data) throw new Error(`Applicant "${id.value}" not found`)
    return data
  }

  private readonly store: Map<string, Applicant>
  private nextId: number
}

const DRAFT_SENTINEL = "$draft"
