import {
  type JobSearchID,
  type JobSearchInfo,
  type SearchMode,
  JobSearch,
  makeJobSearchID,
} from "@/models/job-search"

import type { ApplicantID } from "@/models/applicant"

import type { JobSearchRepository } from ".."

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
      .filter(
        ([id, data]) => id !== prefix && data.applicantId === applicantId.value,
      )
      .map(([id, data]) => ({
        id: makeJobSearchID(id),
        displayName: data.jobSearch.searchTerm,
      }))
  }

  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID } {
    const entry = this.getOrThrow(id)
    return {
      jobSearch: JobSearch.parse(structuredClone(entry.jobSearch)),
      applicantId: { value: entry.applicantId },
    }
  }

  save(id: JobSearchID, data: JobSearch): void {
    const entry = this.getOrThrow(id)
    entry.jobSearch = JobSearch.parse(structuredClone(data))
  }

  create(
    searchTerm: string,
    applicantId: ApplicantID,
    searchMode?: SearchMode,
  ): JobSearchID {
    const id = makeJobSearchID(String(++this.nextId))
    const jobSearch = new JobSearch()
    jobSearch.searchTerm = searchTerm
    jobSearch.mode = searchMode ?? "employment"
    this.store.set(id.value, { jobSearch, applicantId: applicantId.value })
    return id
  }

  delete(id: JobSearchID): void {
    this.store.delete(id.value)
  }

  loadDraft(applicantId: ApplicantID): JobSearch | undefined {
    const snapshot = this.drafts.get(applicantId.value)
    if (!snapshot) return undefined
    const parsed = JobSearch.parse(structuredClone(snapshot))
    return parsed.isDifferentFromDefault() ? parsed : undefined
  }

  saveDraft(applicantId: ApplicantID, draft: JobSearch): void {
    this.drafts.set(applicantId.value, JobSearch.parse(structuredClone(draft)))
  }

  finalizeDraft(applicantId: ApplicantID): JobSearchID {
    const draft = this.drafts.get(applicantId.value)
    if (!draft)
      throw new Error(`Draft for applicant "${applicantId.value}" not found`)
    const resolved = this.resolveDraftSearchTerm(
      JobSearch.parse(structuredClone(draft)),
    )
    const id = makeJobSearchID(String(++this.nextId))
    this.store.set(id.value, {
      jobSearch: resolved,
      applicantId: applicantId.value,
    })
    this.deleteDraft(applicantId)
    return id
  }

  private resolveDraftSearchTerm(jobSearch: JobSearch): JobSearch {
    const normalized = new JobSearch()
    normalized.searchTerm =
      jobSearch.searchTerm.trim().length > 0
        ? jobSearch.searchTerm.trim()
        : "Neue Suche"
    normalized.radiusKm = jobSearch.radiusKm
    normalized.mode = jobSearch.mode
    normalized.sources = jobSearch.sources
    normalized.maxResultsPerSource = jobSearch.maxResultsPerSource
    normalized.maxCommuteMinutes = jobSearch.maxCommuteMinutes
    normalized.notes = jobSearch.notes
    normalized.coverLetter = jobSearch.coverLetter
    return normalized
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
