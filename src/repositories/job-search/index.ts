import type {
  JobSearch,
  JobSearchID,
  JobSearchInfo,
  SearchMode,
} from "@/models/job-search"
import type { ApplicantID } from "@/models/applicant"

export interface JobSearchRepository {
  listByApplicant(applicantId: ApplicantID): JobSearchInfo[]
  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID }
  save(id: JobSearchID, jobSearch: JobSearch): void
  delete(id: JobSearchID): void
  create(
    searchTerm: string,
    applicantId: ApplicantID,
    searchMode?: SearchMode,
  ): JobSearchID
  loadDraft(applicantId: ApplicantID): JobSearch | undefined
  saveDraft(applicantId: ApplicantID, draft: JobSearch): void
  deleteDraft(applicantId: ApplicantID): void
  finalizeDraft(applicantId: ApplicantID): JobSearchID
}

export { createSqliteJobSearchRepository } from "./sqlite"
export { createStubJobSearchRepository } from "./stub"
