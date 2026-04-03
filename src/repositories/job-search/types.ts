import type {
  JobSearch,
  JobSearchInfo,
  SearchMode,
} from "@/models/job-search/types.js"

export interface JobSearchRepository {
  list(): JobSearchInfo[]
  listByApplicant(applicantId: string): JobSearchInfo[]
  exists(id: string): boolean
  load(id: string): JobSearch
  save(id: string, data: JobSearch): void
  create(
    searchTerm: string,
    applicantId: string,
    searchMode?: SearchMode,
  ): string
  delete(id: string): void
  loadApplicationCoverLetter(jobSearchId: string, vacancyHash: string): string
  saveApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
    content: string,
  ): void
}
