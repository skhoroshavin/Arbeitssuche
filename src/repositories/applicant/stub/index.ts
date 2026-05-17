import {
  type Applicant,
  type ApplicantDraft,
  type ApplicantDraftSnapshot,
  type ApplicantInfo,
  type ApplicantPersonal,
} from "@/models/applicant"
import {
  DEFAULT_APPLICANT,
  isMeaningfulApplicantDraftSnapshot,
  resolveApplicant,
} from "@/models/applicant/index.js"
import {
  loadFinalizedApplicantDraft,
  type ApplicantRepository,
} from "../types.js"
import { createUniqueDerivedId } from "@/utils/index.js"

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

  load(id: string): Applicant {
    return resolveApplicant(structuredClone(this.getOrThrow(id)))
  }

  save(id: string, data: Applicant): void {
    this.getOrThrow(id)
    this.store.set(id, resolveApplicant(structuredClone(data)))
  }

  create(name: string): string {
    const id = createUniqueDerivedId(name, (id) => this.exists(id))
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

  loadDraft(): ApplicantDraft | undefined {
    if (!this.draft) return undefined
    return {
      snapshot: structuredClone(this.draft),
      meaningful: isMeaningfulApplicantDraftSnapshot(this.draft),
    }
  }

  saveDraft(draft: ApplicantDraftSnapshot): void {
    this.draft = resolveApplicant(structuredClone(draft))
  }

  finalizeDraft(): string {
    return loadFinalizedApplicantDraft({
      draft: this.draft,
      getSnapshot: (draft) => draft,
      exists: (candidate) => this.exists(candidate),
      persist: ({ id, data }) => {
        this.store.set(id, data)
      },
      clearDraft: () => {
        this.deleteDraft()
      },
    })
  }

  exists(id: string): boolean {
    return this.store.has(id)
  }

  deleteDraft(): void {
    this.draft = undefined
  }

  private getOrThrow(id: string): Applicant {
    const data = this.store.get(id)
    if (!data) throw new Error(`Applicant "${id}" not found`)
    return data
  }

  private readonly store: Map<string, Applicant>
  private draft?: ApplicantDraftSnapshot
}
