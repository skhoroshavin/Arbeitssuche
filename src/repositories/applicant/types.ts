import type {
  Applicant,
  ApplicantDraft,
  ApplicantDraftSnapshot,
  ApplicantInfo,
} from "@/models/applicant/types.js"

export interface ApplicantRepository {
  list(): ApplicantInfo[]
  exists(id: string): boolean
  load(id: string): Applicant
  save(id: string, data: Applicant): void
  create(name: string): string
  delete(id: string): void
  loadDraft(): ApplicantDraft | undefined
  saveDraft(draft: ApplicantDraftSnapshot): void
  deleteDraft(): void
  finalizeDraft(): string
}
