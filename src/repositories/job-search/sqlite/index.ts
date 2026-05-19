import {
  type JobSearchID,
  type JobSearchInfo,
  type SearchMode,
  JobSearch,
  makeJobSearchID,
} from "@/models/job-search"

import type { ApplicantID } from "@/models/applicant"

import type { JobSearchRepository } from ".."

import { Database, type Statement } from "@/utils/index.js"

import { z } from "zod"

export function createSqliteJobSearchRepository(
  database: Database,
): JobSearchRepository {
  runJobSearchMigration(database)
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

function runJobSearchMigration(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      repository TEXT PRIMARY KEY,
      version TEXT NOT NULL
    )
  `)

  const row = database
    .prepare("SELECT version FROM _migrations WHERE repository = ?")
    .get("job-search")
  const version =
    row && typeof row === "object" && "version" in row
      ? String(row.version)
      : "0.0.0"

  if (semverGreaterThan("0.3.0", version)) {
    database.transaction(() => {
      database.exec(`DROP TABLE IF EXISTS job_search_drafts`)

      if (tableExists(database, "job_searches")) {
        if (!columnExists(database, "job_searches", "cover_letter")) {
          database.exec(`
            ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT ''
          `)
          database.exec(`
            UPDATE job_searches
            SET cover_letter = COALESCE((
              SELECT content FROM cover_letters
              WHERE cover_letters.job_search_id = job_searches.id
                AND vacancy_hash = ''
            ), '')
          `)
          database.exec(`DELETE FROM cover_letters WHERE vacancy_hash = ''`)
        }

        database.exec(`
          UPDATE job_searches SET data = json_remove(data, '$.id')
          WHERE json_type(data, '$.id') IS NOT NULL
        `)
        database.exec(`
          UPDATE job_searches SET data = json_remove(data, '$.applicantId')
          WHERE json_type(data, '$.applicantId') IS NOT NULL
        `)
      }

      database.exec(`
        INSERT OR REPLACE INTO _migrations (repository, version)
        VALUES ('job-search', '0.3.0')
      `)
    })
  }
}

function semverGreaterThan(a: string, b: string): boolean {
  const [aMajor, aMinor, aPatch] = a.split(".").map(Number)
  const [bMajor, bMinor, bPatch] = b.split(".").map(Number)
  if (aMajor !== bMajor) return aMajor > bMajor
  if (aMinor !== bMinor) return aMinor > bMinor
  return aPatch > bPatch
}

function tableExists(database: Database, name: string): boolean {
  const row = database
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name)
  return row !== undefined
}

function columnExists(
  database: Database,
  table: string,
  column: string,
): boolean {
  const row = database
    .prepare("SELECT 1 FROM pragma_table_info(?) WHERE name = ?")
    .get(table, column)
  return row !== undefined
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
    const result = this.database
      .prepare(
        "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM job_searches WHERE id GLOB '[0-9]*'",
      )
      .get()
    const parsed = z.object({ max: z.number() }).safeParse(result)
    this.nextId = parsed.success ? parsed.data.max : 0
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
    const data = new JobSearch()
    data.searchTerm = searchTerm
    data.mode = searchMode ?? "employment"
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
    const jobSearch = JobSearch.parse(JSON.parse(parsed.data))
    return {
      jobSearch,
      applicantId: { value: parsed.applicant_id },
    }
  }

  save(id: JobSearchID, data: JobSearch): void {
    const normalized = JobSearch.parse(structuredClone(data))
    const result = this.updateStmt.run(
      this.loadApplicantId(id),
      normalized.searchTerm,
      normalized.coverLetter,
      JSON.stringify(normalized),
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
    const normalized = JobSearch.parse(structuredClone(draft))
    const sentinel = draftSentinel(applicantId)
    this.saveDraftStmt.run(
      sentinel,
      applicantId.value,
      JSON.stringify(normalized),
    )
  }

  finalizeDraft(applicantId: ApplicantID): JobSearchID {
    return this.database.transaction(() => {
      const draft = this.loadDraft(applicantId)
      if (!draft)
        throw new Error(`Draft for applicant "${applicantId.value}" not found`)
      const resolved = this.resolveDraftSearchTerm(
        JobSearch.parse(structuredClone(draft)),
      )
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

  loadDraft(applicantId: ApplicantID): JobSearch | undefined {
    const sentinel = draftSentinel(applicantId)
    const row = this.loadDraftStmt.getJsonData(sentinel)
    if (row === undefined) return undefined
    const parsed = JobSearch.parse(row)
    return parsed.isDifferentFromDefault() ? parsed : undefined
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
