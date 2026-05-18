import {
  DEFAULT_JOB_SEARCH,
  isMeaningfulJobSearchEditorSnapshot,
  resolveDraftJobSearch,
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

import { Database, type Statement } from "@/utils/index.js"

import { z } from "zod"
import { JobSearchSchema } from "@/models/job-search"

export function createSqliteJobSearchRepository(
  database: Database,
): JobSearchRepository {
  database.exec(`
    CREATE TABLE IF NOT EXISTS job_searches (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL,
      search_term TEXT NOT NULL DEFAULT '',
      cover_letter TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cover_letters (
      job_search_id TEXT NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
      vacancy_hash TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      PRIMARY KEY (job_search_id, vacancy_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_job_searches_applicant ON job_searches(applicant_id);
  `)
  const repo = new SqliteJobSearchRepository(database)
  repo.seedNextId()
  return repo
}

class SqliteJobSearchRepository implements JobSearchRepository {
  constructor(database: Database) {
    this.database = database
    this.listByApplicantStmt = database.prepare(
      "SELECT id, applicant_id, search_term FROM job_searches WHERE applicant_id = ?",
    )
    this.loadStmt = database.prepare(
      "SELECT applicant_id, data FROM job_searches WHERE id = ?",
    )
    this.updateStmt = database.prepare(
      "UPDATE job_searches SET applicant_id = ?, search_term = ?, cover_letter = ?, data = ? WHERE id = ?",
    )
    this.insertStmt = database.prepare(
      "INSERT INTO job_searches (id, applicant_id, search_term, cover_letter, data) VALUES (?, ?, ?, ?, ?)",
    )
    this.deleteStmt = database.prepare("DELETE FROM job_searches WHERE id = ?")
    this.loadDraftStmt = database.prepare(
      "SELECT data FROM job_searches WHERE id = ?",
    )
    this.saveDraftStmt = database.prepare(
      "INSERT OR REPLACE INTO job_searches (id, applicant_id, search_term, cover_letter, data) VALUES (?, ?, '', '', ?)",
    )
    this.deleteDraftStmt = database.prepare(
      "DELETE FROM job_searches WHERE id = ?",
    )
  }

  seedNextId(): void {
    const result = this.database.prepare(
      "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM job_searches WHERE id GLOB '[0-9]*'",
    ).get() as { max: number } | undefined
    this.nextId = Number(result?.max ?? 0)
  }

  listByApplicant(applicantId: ApplicantID): JobSearchInfo[] {
    const prefix = `$draft_${applicantId.value}`
    return this.listByApplicantStmt
      .all(applicantId.value)
      .map((row) => parseJobSearchRow(row))
      .filter((info) => info.id.value !== prefix)
  }

  create(
    searchTerm: string,
    applicantId: ApplicantID,
    searchMode?: SearchMode,
  ): JobSearchID {
    const id = this.generateId()
    const data = resolveJobSearch({
      searchTerm,
      mode: searchMode ?? "employment",
    })
    this.insertStmt.run(
      id.value,
      applicantId.value,
      searchTerm,
      "",
      JSON.stringify(data),
    )
    return id
  }

  load(id: JobSearchID): { jobSearch: JobSearch; applicantId: ApplicantID } {
    const row = this.loadStmt.get(id.value)
    if (row === undefined) throw new Error(`Job search "${id.value}" not found`)
    const parsed = z
      .object({ applicant_id: z.string(), data: z.string() })
      .parse(row)
    const jobSearch = resolveJobSearch(JobSearchSchema.parse(JSON.parse(parsed.data)))
    return {
      jobSearch,
      applicantId: { value: parsed.applicant_id },
    }
  }

  save(id: JobSearchID, data: JobSearch): void {
    const resolved = resolveJobSearch(data)
    const result = this.updateStmt.run(
      this.loadApplicantId(id),
      resolved.searchTerm,
      resolved.coverLetter,
      JSON.stringify(resolved),
      id.value,
    )
    if (result.changes === 0)
      throw new Error(`Job search "${id.value}" not found`)
  }

  private loadApplicantId(id: JobSearchID): string {
    const row = this.loadStmt.get(id.value)
    if (row === undefined) throw new Error(`Job search "${id.value}" not found`)
    return z.object({ applicant_id: z.string() }).parse(row).applicant_id
  }

  delete(id: JobSearchID): void {
    this.deleteStmt.run(id.value)
  }

  saveDraft(applicantId: ApplicantID, draft: JobSearch): void {
    const resolved = resolveJobSearch(draft)
    const sentinel = draftSentinel(applicantId)
    this.saveDraftStmt.run(
      sentinel,
      applicantId.value,
      JSON.stringify(resolved),
    )
  }

  finalizeDraft(applicantId: ApplicantID): JobSearchID {
    return this.database.transaction(() => {
      const draft = this.loadDraft(applicantId)
      if (!draft)
        throw new Error(`Draft for applicant "${applicantId.value}" not found`)
      const resolved = resolveDraftJobSearch(structuredClone(draft))
      const id = this.generateId()
      this.insertStmt.run(
        id.value,
        applicantId.value,
        resolved.searchTerm,
        resolved.coverLetter,
        JSON.stringify(resolved),
      )
      this.deleteDraft(applicantId)
      return id
    })
  }

  loadDraft(applicantId: ApplicantID): JobSearch | undefined {
    const sentinel = draftSentinel(applicantId)
    const row = this.loadDraftStmt.getJsonData(sentinel)
    if (row === undefined) return undefined
    const parsed = resolveJobSearch(JobSearchSchema.parse(row))
    return isMeaningfulJobSearchEditorSnapshot(parsed) ? parsed : undefined
  }

  deleteDraft(applicantId: ApplicantID): void {
    this.deleteDraftStmt.run(draftSentinel(applicantId))
  }

  private generateId(): JobSearchID {
    return makeJobSearchID(String(++this.nextId))
  }

  private readonly database: Database
  private readonly listByApplicantStmt: Statement
  private readonly loadStmt: Statement
  private readonly updateStmt: Statement
  private readonly insertStmt: Statement
  private readonly deleteStmt: Statement
  private readonly loadDraftStmt: Statement
  private readonly saveDraftStmt: Statement
  private readonly deleteDraftStmt: Statement
  private nextId = 0
}

function draftSentinel(applicantId: ApplicantID): string {
  return `$draft_${applicantId.value}`
}

function parseJobSearchRow(raw: unknown): JobSearchInfo {
  const r = z
    .object({
      id: z.string(),
      search_term: z.string(),
    })
    .parse(raw)
  return { id: makeJobSearchID(r.id), displayName: r.search_term }
}
