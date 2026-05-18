import type {
  JobSearch,
  JobSearchID,
  JobSearchInfo,
  ApplicantID,
  SearchMode,
} from "@/models/job-search"

export interface JobSearchRepository {
  listByApplicant(applicantId: ApplicantID): JobSearchInfo[]
  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID }
  save(id: JobSearchID, jobSearch: JobSearch): void
  delete(id: JobSearchID): void
  create(searchTerm: string, applicantId: ApplicantID, searchMode?: SearchMode): JobSearchID
  loadDraft(applicantId: ApplicantID): JobSearch | undefined
  saveDraft(applicantId: ApplicantID, draft: JobSearch): void
  deleteDraft(applicantId: ApplicantID): void
  finalizeDraft(applicantId: ApplicantID): JobSearchID
}
