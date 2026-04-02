import {
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_PREFERENCES,
  type JobSearch,
  type JobSearchInfo,
  type SearchMode,
} from "@/models/job-search/types.js";
import { resolveJobSearch } from "@/models/job-search/index.js";
import type { JobSearchRepository } from "@/repositories/job-search/types.js";
import { createUniqueDerivedId } from "@/utils/id.js";

export function createStubJobSearchRepository(
  initial?: Record<string, Partial<StubData>>,
): JobSearchRepository {
  return new StubJobSearchRepository(initial);
}

class StubJobSearchRepository implements JobSearchRepository {
  constructor(initial?: Record<string, Partial<StubData>>) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, data]) => [
            id,
            {
              jobSearch: data.jobSearch ?? {
                id,
                applicantId: "",
                params: { ...DEFAULT_SEARCH_PARAMS },
                preferences: { ...DEFAULT_PREFERENCES },
              },
              coverLetter: data.coverLetter,
              applicationCoverLetters: data.applicationCoverLetters,
            },
          ])
        : [],
    );
  }

  listByApplicant(applicantId: string): JobSearchInfo[] {
    return this.list().filter((js) => js.applicantId === applicantId);
  }

  list(): JobSearchInfo[] {
    return [...this.store.values()].map((data) => ({
      id: data.jobSearch.id,
      applicantId: data.jobSearch.applicantId,
      searchTerm: data.jobSearch.params.searchTerm,
    }));
  }

  exists(id: string): boolean {
    return this.store.has(id);
  }

  load(id: string): JobSearch {
    return resolveJobSearch(structuredClone(this.getOrThrow(id).jobSearch));
  }

  save(id: string, data: JobSearch): void {
    const entry = this.getOrThrow(id);
    entry.jobSearch = resolveJobSearch(structuredClone(data));
  }

  create(
    searchTerm: string,
    applicantId: string,
    searchMode?: SearchMode,
  ): string {
    const id = createUniqueDerivedId(searchTerm, (id) => this.store.has(id));
    const parameters = { ...DEFAULT_SEARCH_PARAMS, searchTerm };
    if (searchMode) parameters.searchMode = searchMode;
    const jobSearch = resolveJobSearch({
      id,
      applicantId,
      params: parameters,
      preferences: { ...DEFAULT_PREFERENCES },
    });
    this.store.set(id, {
      jobSearch,
    });
    return id;
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  loadApplicationCoverLetter(jobSearchId: string, vacancyHash: string): string {
    return (
      this.store.get(jobSearchId)?.applicationCoverLetters?.get(vacancyHash) ??
      ""
    );
  }

  saveApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
    content: string,
  ): void {
    const data = this.getOrThrow(jobSearchId);
    if (!data.applicationCoverLetters) {
      data.applicationCoverLetters = new Map();
    }
    data.applicationCoverLetters.set(vacancyHash, content);
  }

  private getOrThrow(id: string): StubData {
    const data = this.store.get(id);
    if (!data) throw new Error(`Job search "${id}" not found`);
    return data;
  }

  private readonly store: Map<string, StubData>;
}

interface StubData {
  jobSearch: JobSearch;
  coverLetter?: string;
  applicationCoverLetters?: Map<string, string>;
}
