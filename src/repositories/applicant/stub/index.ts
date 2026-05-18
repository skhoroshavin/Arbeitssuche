import {
  type Applicant,
  type ApplicantID,
  type ApplicantInfo,
  type ApplicantPersonal,
  ApplicantID as makeApplicantID,
} from "@/models/applicant"
import {
  DEFAULT_APPLICANT,
  isMeaningfulApplicantDraftSnapshot,
  resolveApplicant,
} from "@/models/applicant/index.js"
import type { ApplicantRepository } from "../types.js"

const DRAFT_SENTINEL = "$draft"

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
    return resolveApplicant(structuredClone(this.getOrThrow(id)))
  }

  save(id: ApplicantID, data: Applicant): void {
    this.getOrThrow(id)
    this.store.set(id.value, resolveApplicant(structuredClone(data)))
  }

  delete(id: ApplicantID): void {
    this.store.delete(id.value)
  }

  loadDraft(): Applicant | undefined {
    const draft = this.store.get(DRAFT_SENTINEL)
    if (!draft) return undefined
    const resolved = resolveApplicant(structuredClone(draft))
    return isMeaningfulApplicantDraftSnapshot(resolved) ? resolved : undefined
  }

  saveDraft(draft: Applicant): void {
    this.store.set(DRAFT_SENTINEL, resolveApplicant(structuredClone(draft)))
  }

  finalizeDraft(): ApplicantID {
    const draft = this.loadDraft()
    if (!draft) throw new Error("Applicant draft not found")
    const id = makeApplicantID(String(++this.nextId))
    this.store.set(id.value, resolveApplicant(structuredClone(draft)))
    this.deleteDraft()
    return id
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
