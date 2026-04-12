import {
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_PREFERENCES,
  isMeaningfulJobSearchEditorSnapshot,
  mapSnapshotToPersistedJobSearch,
  resolveDraftJobSearchEditorSnapshot,
} from "@/models/job-search/index.js"
import type {
  JobSearchDraft,
  JobSearch,
  JobSearchInfo,
  JobSearchEditorSnapshot,
  SearchMode,
} from "@/models/job-search"
import { resolveJobSearch } from "@/models/job-search/index.js"
import type { JobSearchRepository } from "../types.js"
import {
  Database,
  createUniqueDerivedId,
  parseRow,
} from "@/utils/node/index.js"
import typia from "typia"

export function createSqliteJobSearchRepository(
  database: Database,
): JobSearchRepository {
  database.exec(`
    CREATE TABLE IF NOT EXISTS job_searches (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL,
      search_term TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cover_letters (
      job_search_id TEXT NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
      vacancy_hash TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      PRIMARY KEY (job_search_id, vacancy_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_job_searches_applicant ON job_searches(applicant_id);

    CREATE TABLE IF NOT EXISTS job_search_drafts (
      applicant_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      meaningful INTEGER NOT NULL
    );
  `)
  return new SqliteJobSearchRepository(database)
}

class SqliteJobSearchRepository implements JobSearchRepository {
  constructor(database: Database) {
    this.database = database
    this.listStmt = database.prepare(
      "SELECT id, applicant_id, search_term FROM job_searches",
    )
    this.listByApplicantStmt = database.prepare(
      "SELECT id, applicant_id, search_term FROM job_searches WHERE applicant_id = ?",
    )
    this.existsStmt = database.prepare(
      "SELECT 1 FROM job_searches WHERE id = ?",
    )
    this.loadStmt = database.prepare(
      "SELECT data FROM job_searches WHERE id = ?",
    )
    this.updateStmt = database.prepare(
      "UPDATE job_searches SET applicant_id = ?, search_term = ?, data = ? WHERE id = ?",
    )
    this.insertStmt = database.prepare(
      "INSERT INTO job_searches (id, applicant_id, search_term, data) VALUES (?, ?, ?, ?)",
    )
    this.deleteStmt = database.prepare("DELETE FROM job_searches WHERE id = ?")
    this.loadDraftStmt = database.prepare(
      "SELECT data, meaningful FROM job_search_drafts WHERE applicant_id = ?",
    )
    this.saveDraftStmt = database.prepare(
      "INSERT OR REPLACE INTO job_search_drafts (applicant_id, data, meaningful) VALUES (?, ?, ?)",
    )
    this.deleteDraftStmt = database.prepare(
      "DELETE FROM job_search_drafts WHERE applicant_id = ?",
    )
    this.loadCoverLetterStmt = database.prepare(
      "SELECT content FROM cover_letters WHERE job_search_id = ? AND vacancy_hash = ?",
    )
    this.saveCoverLetterStmt = database.prepare(
      "INSERT OR REPLACE INTO cover_letters (job_search_id, vacancy_hash, content) VALUES (?, ?, ?)",
    )
  }

  list(): JobSearchInfo[] {
    return this.listStmt.all().map((row) => parseJobSearchRow(row))
  }

  listByApplicant(applicantId: string): JobSearchInfo[] {
    return this.listByApplicantStmt
      .all(applicantId)
      .map((row) => parseJobSearchRow(row))
  }

  create(
    searchTerm: string,
    applicantId: string,
    searchMode?: SearchMode,
  ): string {
    const id = createUniqueDerivedId(searchTerm, (id) => this.exists(id))
    const parameters = { ...DEFAULT_SEARCH_PARAMS, searchTerm }
    if (searchMode) parameters.searchMode = searchMode
    const data = resolveJobSearch({
      id,
      applicantId,
      params: parameters,
      preferences: { ...DEFAULT_PREFERENCES },
    })
    this.insertStmt.run(id, applicantId, searchTerm, JSON.stringify(data))
    return id
  }

  load(id: string): JobSearch {
    const jobSearch = parseRow(this.loadStmt.get(id))
    if (jobSearch === undefined) throw new Error(`Job search "${id}" not found`)
    return resolveJobSearch(typia.assert<JobSearch>(jobSearch))
  }

  save(id: string, data: JobSearch): void {
    const resolved = resolveJobSearch(data)
    const result = this.updateStmt.run(
      resolved.applicantId,
      resolved.params.searchTerm,
      JSON.stringify(resolved),
      id,
    )
    if (result.changes === 0) throw new Error(`Job search "${id}" not found`)
  }

  delete(id: string): void {
    this.deleteStmt.run(id)
  }

  saveDraft(applicantId: string, draft: JobSearchEditorSnapshot): void {
    const meaningful = isMeaningfulJobSearchEditorSnapshot(draft)
    this.saveDraftStmt.run(
      applicantId,
      JSON.stringify(draft),
      meaningful ? 1 : 0,
    )
  }

  finalizeDraft(applicantId: string): string {
    return this.database.transaction(() => {
      const draft = this.loadDraft(applicantId)
      if (!draft)
        throw new Error(`Draft for applicant "${applicantId}" not found`)
      const resolvedSnapshot = resolveDraftJobSearchEditorSnapshot(
        draft.snapshot,
      )
      const resolvedSearchTerm = resolvedSnapshot.params.searchTerm
      const id = createUniqueDerivedId(resolvedSearchTerm, (searchId) =>
        this.exists(searchId),
      )
      const jobSearch = mapSnapshotToPersistedJobSearch(
        id,
        applicantId,
        resolvedSnapshot,
      )
      this.insertStmt.run(
        id,
        applicantId,
        jobSearch.params.searchTerm,
        JSON.stringify(jobSearch),
      )
      this.saveApplicationCoverLetter(id, "", draft.snapshot.coverLetterContent)
      this.deleteDraft(applicantId)
      return id
    })
  }

  exists(id: string): boolean {
    return this.existsStmt.get(id) !== undefined
  }

  loadDraft(applicantId: string): JobSearchDraft | undefined {
    const raw = this.loadDraftStmt.get(applicantId)
    if (raw === undefined) return undefined
    const parsed = typia.assert<JobSearchDraftRow>(raw)
    const snapshot = typia.assert<JobSearchEditorSnapshot>(
      JSON.parse(parsed.data),
    )
    return {
      applicantId,
      snapshot,
      meaningful: parsed.meaningful === 1,
    }
  }

  deleteDraft(applicantId: string): void {
    this.deleteDraftStmt.run(applicantId)
  }

  loadApplicationCoverLetter(jobSearchId: string, vacancyHash: string): string {
    const raw = this.loadCoverLetterStmt.get(jobSearchId, vacancyHash)
    if (raw === undefined) return ""
    return typia.assert<{ content: string }>(raw).content
  }

  saveApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
    content: string,
  ): void {
    this.saveCoverLetterStmt.run(jobSearchId, vacancyHash, content)
  }

  private readonly database: Database
  private readonly listStmt: ReturnType<Database["prepare"]>
  private readonly listByApplicantStmt: ReturnType<Database["prepare"]>
  private readonly existsStmt: ReturnType<Database["prepare"]>
  private readonly loadStmt: ReturnType<Database["prepare"]>
  private readonly updateStmt: ReturnType<Database["prepare"]>
  private readonly insertStmt: ReturnType<Database["prepare"]>
  private readonly deleteStmt: ReturnType<Database["prepare"]>
  private readonly loadDraftStmt: ReturnType<Database["prepare"]>
  private readonly saveDraftStmt: ReturnType<Database["prepare"]>
  private readonly deleteDraftStmt: ReturnType<Database["prepare"]>
  private readonly loadCoverLetterStmt: ReturnType<Database["prepare"]>
  private readonly saveCoverLetterStmt: ReturnType<Database["prepare"]>
}

function parseJobSearchRow(raw: unknown): JobSearchInfo {
  return mapRow(typia.assert<JobSearchRow>(raw))
}

function mapRow(r: JobSearchRow): JobSearchInfo {
  return { id: r.id, applicantId: r.applicant_id, searchTerm: r.search_term }
}

type JobSearchRow = { id: string; applicant_id: string; search_term: string }

interface JobSearchDraftRow {
  data: string
  meaningful: number
}
