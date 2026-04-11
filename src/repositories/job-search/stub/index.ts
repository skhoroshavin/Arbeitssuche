import {
  isMeaningfulJobSearchEditorSnapshot,
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_PREFERENCES,
  mapSnapshotToPersistedJobSearch,
} from "@/models/job-search/index.js"
import type {
  JobSearchDraft,
  JobSearch,
  JobSearchEditorSnapshot,
  JobSearchInfo,
  SearchMode,
} from "@/models/job-search/types.js"
import { resolveJobSearch } from "@/models/job-search/index.js"
import type { JobSearchRepository } from "@/repositories/job-search/types.js"
import { createUniqueDerivedId } from "@/utils/node/index.js"

export function createStubJobSearchRepository(
  initial?: Record<string, Partial<StubData>>,
): JobSearchRepository {
  return new StubJobSearchRepository(initial)
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
    )
    this.drafts = new Map()
  }

  listByApplicant(applicantId: string): JobSearchInfo[] {
    return this.list().filter((js) => js.applicantId === applicantId)
  }

  list(): JobSearchInfo[] {
    return [...this.store.values()].map((data) => ({
      id: data.jobSearch.id,
      applicantId: data.jobSearch.applicantId,
      searchTerm: data.jobSearch.params.searchTerm,
    }))
  }

  exists(id: string): boolean {
    return this.store.has(id)
  }

  load(id: string): JobSearch {
    return resolveJobSearch(structuredClone(this.getOrThrow(id).jobSearch))
  }

  save(id: string, data: JobSearch): void {
    const entry = this.getOrThrow(id)
    entry.jobSearch = resolveJobSearch(structuredClone(data))
  }

  create(
    searchTerm: string,
    applicantId: string,
    searchMode?: SearchMode,
  ): string {
    const id = createUniqueDerivedId(searchTerm, (id) => this.store.has(id))
    const parameters = { ...DEFAULT_SEARCH_PARAMS, searchTerm }
    if (searchMode) parameters.searchMode = searchMode
    const jobSearch = resolveJobSearch({
      id,
      applicantId,
      params: parameters,
      preferences: { ...DEFAULT_PREFERENCES },
    })
    this.store.set(id, {
      jobSearch,
    })
    return id
  }

  delete(id: string): void {
    this.store.delete(id)
  }

  loadDraft(applicantId: string): JobSearchDraft | undefined {
    const snapshot = this.drafts.get(applicantId)
    if (!snapshot) return undefined
    return {
      applicantId,
      snapshot: structuredClone(snapshot),
      meaningful: isMeaningfulJobSearchEditorSnapshot(snapshot),
    }
  }

  saveDraft(applicantId: string, draft: JobSearchEditorSnapshot): void {
    this.drafts.set(applicantId, structuredClone(draft))
  }

  finalizeDraft(applicantId: string): string {
    const draft = this.drafts.get(applicantId)
    if (!draft)
      throw new Error(`Draft for applicant "${applicantId}" not found`)
    const searchTerm = draft.params.searchTerm.trim()
    const resolvedSearchTerm = searchTerm.length > 0 ? searchTerm : "Neue Suche"
    const id = createUniqueDerivedId(resolvedSearchTerm, (searchId) =>
      this.store.has(searchId),
    )
    const jobSearch = mapSnapshotToPersistedJobSearch(id, applicantId, {
      ...draft,
      params: {
        ...draft.params,
        searchTerm: resolvedSearchTerm,
      },
    })
    this.store.set(id, {
      jobSearch,
      applicationCoverLetters: new Map([["", draft.coverLetterContent]]),
    })
    this.deleteDraft(applicantId)
    return id
  }

  deleteDraft(applicantId: string): void {
    this.drafts.delete(applicantId)
  }

  loadApplicationCoverLetter(jobSearchId: string, vacancyHash: string): string {
    return (
      this.store.get(jobSearchId)?.applicationCoverLetters?.get(vacancyHash) ??
      ""
    )
  }

  saveApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
    content: string,
  ): void {
    const data = this.getOrThrow(jobSearchId)
    if (!data.applicationCoverLetters) {
      data.applicationCoverLetters = new Map()
    }
    data.applicationCoverLetters.set(vacancyHash, content)
  }

  private getOrThrow(id: string): StubData {
    const data = this.store.get(id)
    if (!data) throw new Error(`Job search "${id}" not found`)
    return data
  }

  private readonly store: Map<string, StubData>
  private readonly drafts: Map<string, JobSearchEditorSnapshot>
}

interface StubData {
  jobSearch: JobSearch
  coverLetter?: string
  applicationCoverLetters?: Map<string, string>
}
