import {
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_PREFERENCES,
  type JobSearch,
  type JobSearchInfo,
  type SearchMode,
} from "@/models/job-search/types.js";
import type { JobSearchRepository } from "@/repositories/job-search/types.js";
import { deriveId } from "@/utils/derive-id.js";
import { createWithUniqueId } from "@/utils/create-with-unique-id.js";

interface StubData {
  jobSearch: JobSearch;
  coverLetter?: string;
  applicationCoverLetters?: Map<string, string>;
}

class StubJobSearchRepository implements JobSearchRepository {
  private readonly store: Map<string, StubData>;

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

  private getOrThrow(id: string): StubData {
    const data = this.store.get(id);
    if (!data) throw new Error(`Job search "${id}" not found`);
    return data;
  }

  list(): JobSearchInfo[] {
    return [...this.store.entries()].map(([id, data]) => ({
      id,
      applicantId: data.jobSearch.applicantId,
      searchTerm: data.jobSearch.params.searchTerm,
    }));
  }

  listByApplicant(applicantId: string): JobSearchInfo[] {
    return this.list().filter((js) => js.applicantId === applicantId);
  }

  exists(id: string): boolean {
    return this.store.has(id);
  }

  load(id: string): JobSearch {
    return structuredClone(this.getOrThrow(id).jobSearch);
  }

  async save(id: string, data: JobSearch) {
    this.getOrThrow(id); // ensure exists
    this.store.get(id)!.jobSearch = structuredClone(data);
  }

  create(
    searchTerm: string,
    applicantId: string,
    searchMode?: SearchMode,
  ): string {
    const id = createWithUniqueId(
      () => deriveId(searchTerm),
      (id) => this.store.has(id),
    );
    const params = { ...DEFAULT_SEARCH_PARAMS, searchTerm };
    if (searchMode) params.searchMode = searchMode;
    this.store.set(id, {
      jobSearch: {
        id,
        applicantId,
        params,
        preferences: { ...DEFAULT_PREFERENCES },
      },
    });
    return id;
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  loadCoverLetter(id: string): string | undefined {
    return this.store.get(id)?.coverLetter;
  }

  async saveCoverLetter(id: string, coverLetter: string) {
    this.getOrThrow(id); // ensure exists
    this.store.get(id)!.coverLetter = coverLetter;
  }

  loadApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
  ): string | undefined {
    return this.store
      .get(jobSearchId)
      ?.applicationCoverLetters?.get(vacancyHash);
  }

  async saveApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
    content: string,
  ): Promise<void> {
    const data = this.getOrThrow(jobSearchId);
    if (!data.applicationCoverLetters) {
      data.applicationCoverLetters = new Map();
    }
    data.applicationCoverLetters.set(vacancyHash, content);
  }
}

export function createStubJobSearchRepository(
  initial?: Record<string, Partial<StubData>>,
): JobSearchRepository {
  return new StubJobSearchRepository(initial);
}
