import {
  isMeaningfulJobSearchEditorSnapshot,
  resolveDraftJobSearch,
  DEFAULT_JOB_SEARCH,
} from "@/models/job-search/index.js"
import type {
  JobSearch,
  JobSearchID,
  JobSearchInfo,
  SearchMode,
} from "@/models/job-search"
import type { ApplicantID } from "@/models/applicant"
import { JobSearchID as makeJobSearchID } from "@/models/job-search/index.js"
import { resolveJobSearch } from "@/models/job-search/index.js"
import type { JobSearchRepository } from "../types.js"

function draftSentinel(applicantId: ApplicantID): string {
  return `$draft_${applicantId.value}`
}

export function createStubJobSearchRepository(
  initial?: Record<string, { jobSearch: JobSearch; applicantId: string }>,
): JobSearchRepository {
  return new StubJobSearchRepository(initial)
}

class StubJobSearchRepository implements JobSearchRepository {
  constructor(
    initial?: Record<string, { jobSearch: JobSearch; applicantId: string }>,
  ) {
    this.store = new Map(
      initial
        ? Object.entries(initial).map(([id, data]) => [
            id,
            {
              jobSearch: data.jobSearch,
              applicantId: data.applicantId,
            },
          ])
        : [],
    )
    this.drafts = new Map()
    this.nextId = this.store.size
  }

  listByApplicant(applicantId: ApplicantID): JobSearchInfo[] {
    const prefix = `$draft_${applicantId.value}`
    return [...this.store.entries()]
      .filter(([id, data]) => id !== prefix && data.applicantId === applicantId.value)
      .map(([id, data]) => ({
        id: makeJobSearchID(id),
        displayName: data.jobSearch.searchTerm,
      }))
  }

  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID } {
    const entry = this.getOrThrow(id)
    return {
      jobSearch: resolveJobSearch(structuredClone(entry.jobSearch)),
      applicantId: { value: entry.applicantId },
    }
  }

  save(id: JobSearchID, data: JobSearch): void {
    const entry = this.getOrThrow(id)
    entry.jobSearch = resolveJobSearch(structuredClone(data))
  }

  create(searchTerm: string, applicantId: ApplicantID, searchMode?: SearchMode): JobSearchID {
    const id = makeJobSearchID(String(++this.nextId))
    const jobSearch = resolveJobSearch({
      searchTerm,
      mode: searchMode ?? "employment",
    })
    this.store.set(id.value, { jobSearch, applicantId: applicantId.value })
    return id
  }

  delete(id: JobSearchID): void {
    this.store.delete(id.value)
  }

  loadDraft(applicantId: ApplicantID): JobSearch | undefined {
    const snapshot = this.drafts.get(applicantId.value)
    if (!snapshot) return undefined
    const resolved = resolveJobSearch(structuredClone(snapshot))
    return isMeaningfulJobSearchEditorSnapshot(resolved) ? resolved : undefined
  }

  saveDraft(applicantId: ApplicantID, draft: JobSearch): void {
    this.drafts.set(applicantId.value, resolveJobSearch(structuredClone(draft)))
  }

  finalizeDraft(applicantId: ApplicantID): JobSearchID {
    const draft = this.drafts.get(applicantId.value)
    if (!draft)
      throw new Error(`Draft for applicant "${applicantId.value}" not found`)
    const resolved = resolveDraftJobSearch(structuredClone(draft))
    const id = makeJobSearchID(String(++this.nextId))
    this.store.set(id.value, {
      jobSearch: resolved,
      applicantId: applicantId.value,
    })
    this.deleteDraft(applicantId)
    return id
  }

  deleteDraft(applicantId: ApplicantID): void {
    this.drafts.delete(applicantId.value)
  }

  private getOrThrow(id: JobSearchID): StubData {
    const data = this.store.get(id.value)
    if (!data) throw new Error(`Job search "${id.value}" not found`)
    return data
  }

  private readonly store: Map<string, StubData>
  private readonly drafts: Map<string, JobSearch>
  private nextId: number
}

interface StubData {
  jobSearch: JobSearch
  applicantId: string
}
