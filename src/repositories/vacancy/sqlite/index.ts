import { Database, semverGreaterThan } from "@/utils/index.js"

import { Vacancy } from "@/models/vacancy/index.js"

import type { Activity } from "@/models/vacancy"

import type { JobSearchID } from "@/models/job-search"

import { resolveVacancy } from "@/models/vacancy/index.js"

import {
  EMPTY_VACANCY_LIST_OUTPUT,
  createVacancyListOutput,
} from "@/repositories/vacancy/output.js"

import type { VacancyRepository } from "@/repositories/vacancy"

import { z } from "zod"

import { VacancyDTOSchema } from "@/models/vacancy"

export function createSqliteVacancyRepository(
  database: Database,
): VacancyRepository {
  runVacancyMigration(database)
  database.exec(`
    CREATE TABLE IF NOT EXISTS vacancy_meta (
      job_search_id TEXT PRIMARY KEY REFERENCES job_searches(id) ON DELETE CASCADE,
      generated_at TEXT NOT NULL,
      latest_crawl TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vacancies (
      job_search_id TEXT NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
      hash TEXT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (job_search_id, hash)
    )
  `)
  return new SqliteVacancyRepository(database)
}

function runVacancyMigration(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      repository TEXT PRIMARY KEY,
      version TEXT NOT NULL
    )
  `)

  const row = database
    .prepare("SELECT version FROM _migrations WHERE repository = ?")
    .get("vacancy")
  const version =
    row && typeof row === "object" && "version" in row
      ? String(row.version)
      : "0.0.0"

  if (semverGreaterThan("0.3.0", version)) {
    database.transaction(() => {
      database.exec(`
        INSERT OR REPLACE INTO _migrations (repository, version)
        VALUES ('vacancy', '0.3.0')
      `)
    })
  }
}

class SqliteVacancyRepository implements VacancyRepository {
  constructor(private readonly database: Database) {
    this.loadMetaStmt = database.prepare(
      "SELECT generated_at, latest_crawl FROM vacancy_meta WHERE job_search_id = ?",
    )
    this.loadAllStmt = database.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ?",
    )
    this.upsertMetaStmt = database.prepare(
      "INSERT OR REPLACE INTO vacancy_meta (job_search_id, generated_at, latest_crawl) VALUES (?, ?, ?)",
    )
    this.deleteStaleVacanciesStmt = database.prepare(
      "DELETE FROM vacancies WHERE job_search_id = ? AND hash NOT IN (SELECT value FROM json_each(?))",
    )
    this.upsertVacancyStmt = database.prepare(
      "INSERT OR REPLACE INTO vacancies (job_search_id, hash, data) VALUES (?, ?, ?)",
    )
    this.findByHashStmt = database.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ? AND hash = ?",
    )
    this.updateVacancyStmt = database.prepare(
      "UPDATE vacancies SET data = ? WHERE job_search_id = ? AND hash = ?",
    )
    this.loadCoverLetterStmt = database.prepare(
      "SELECT content FROM cover_letters WHERE job_search_id = ? AND vacancy_hash = ?",
    )
    this.saveCoverLetterStmt = database.prepare(
      "INSERT OR REPLACE INTO cover_letters (job_search_id, vacancy_hash, content) VALUES (?, ?, ?)",
    )
  }

  loadAll(jobSearchId: JobSearchID) {
    const metaRaw = this.loadMetaStmt.get(jobSearchId.value)
    if (metaRaw === undefined) return EMPTY_VACANCY_LIST_OUTPUT
    const meta = z
      .object({ generated_at: z.string(), latest_crawl: z.string() })
      .parse(metaRaw)

    const vacancies = this.loadAllStmt
      .all(jobSearchId.value)
      .map((raw) => hydrateVacancyRow(raw))

    return {
      generatedAt: meta.generated_at,
      latestCrawl: meta.latest_crawl,
      vacancies,
    }
  }

  save(
    jobSearchId: JobSearchID,
    vacancies: Vacancy[],
    latestCrawl: string,
  ): void {
    const output = createVacancyListOutput(vacancies, latestCrawl)
    const hashes = JSON.stringify(vacancies.map((v) => v.hash))

    this.database.transaction(() => {
      this.upsertMetaStmt.run(
        jobSearchId.value,
        output.generatedAt,
        output.latestCrawl,
      )
      this.deleteStaleVacanciesStmt.run(jobSearchId.value, hashes)
      for (const vacancy of vacancies) {
        this.upsertVacancyStmt.run(
          jobSearchId.value,
          vacancy.hash,
          JSON.stringify(vacancy),
        )
      }
    })
  }

  findByHash(jobSearchId: JobSearchID, hash: string): Vacancy | undefined {
    const row = this.findByHashStmt.getJsonData(jobSearchId.value, hash)
    if (row === undefined) return undefined
    return hydrateVacancy(row)
  }

  addActivity(
    jobSearchId: JobSearchID,
    hash: string,
    activity: Activity,
  ): void {
    const row = this.findByHashStmt.getJsonData(jobSearchId.value, hash)
    if (row === undefined) throw new Error(`Vacancy "${hash}" not found`)

    const vacancy = hydrateVacancy(row)
    const updated = vacancy.with({
      activityHistory: [...vacancy.activityHistory, activity],
    })

    this.updateVacancyStmt.run(JSON.stringify(updated), jobSearchId.value, hash)
  }

  loadCoverLetter(jobSearchId: JobSearchID, vacancyHash: string): string {
    const raw = this.loadCoverLetterStmt.get(jobSearchId.value, vacancyHash)
    if (raw === undefined) return ""
    return CoverLetterRowSchema.parse(raw).content
  }

  saveCoverLetter(
    jobSearchId: JobSearchID,
    vacancyHash: string,
    content: string,
  ): void {
    this.saveCoverLetterStmt.run(jobSearchId.value, vacancyHash, content)
  }

  private readonly loadMetaStmt
  private readonly loadAllStmt
  private readonly upsertMetaStmt
  private readonly deleteStaleVacanciesStmt
  private readonly upsertVacancyStmt
  private readonly findByHashStmt
  private readonly updateVacancyStmt
  private readonly loadCoverLetterStmt
  private readonly saveCoverLetterStmt
}

function hydrateVacancyRow(row: Record<string, unknown>): Vacancy {
  if (typeof row.data !== "string") throw new Error("Invalid vacancy row")
  return hydrateVacancy(JSON.parse(row.data))
}

function hydrateVacancy(data: unknown): Vacancy {
  const parsed = VacancyDTOSchema.partial()
    .loose()
    .parse(stripLegacyCommute(data))
  return new Vacancy(resolveVacancy(parsed))
}

function stripLegacyCommute(data: unknown): unknown {
  if (!isRecord(data)) return data
  if (isRecord(data.commute) && hasLegacyCommuteFormat(data.commute)) {
    return { ...data, commute: undefined }
  }
  return data
}

function hasLegacyCommuteFormat(commute: Record<string, unknown>): boolean {
  return Object.values(commute).some((entry) => !isValidCommuteEntry(entry))
}

function isValidCommuteEntry(entry: unknown): boolean {
  if (!isRecord(entry) || !isRecord(entry.durations)) return false
  return typeof entry.durations.morning === "number"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

const CoverLetterRowSchema = z.object({ content: z.string() })
