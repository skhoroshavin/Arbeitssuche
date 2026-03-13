import type {
  JobSearch,
  JobSearchInfo,
  SearchMode,
} from "@/models/job-search/types.js";

export interface JobSearchRepository {
  list(): JobSearchInfo[];
  listByApplicant(applicantId: string): JobSearchInfo[];
  exists(id: string): boolean;
  load(id: string): JobSearch;
  save(id: string, data: JobSearch): Promise<void>;
  create(
    searchTerm: string,
    applicantId: string,
    searchMode?: SearchMode,
  ): string;
  delete(id: string): void;
  loadCoverLetter(id: string): string | undefined;
  saveCoverLetter(id: string, coverLetter: string): Promise<void>;
  loadApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
  ): string | undefined;
  saveApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
    content: string,
  ): Promise<void>;
}
