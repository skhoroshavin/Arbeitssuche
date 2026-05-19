import type { Applicant, ApplicantID, ApplicantInfo } from "@/models/applicant"

export interface ApplicantRepository {
  list(): ApplicantInfo[]
  load(id: ApplicantID): Applicant
  save(id: ApplicantID, applicant: Applicant): void
  delete(id: ApplicantID): void
  loadDraft(): Applicant | undefined
  saveDraft(draft: Applicant): void
  deleteDraft(): void
  finalizeDraft(): ApplicantID
}
