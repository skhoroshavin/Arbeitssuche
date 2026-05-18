import { Database } from "@/utils/index.js"

import { Vacancy } from "@/models/vacancy/index.js"

import type { Activity } from "@/models/vacancy"

import { resolveVacancy } from "@/models/vacancy/index.js"

import {
  EMPTY_VACANCY_LIST_OUTPUT,
  createVacancyListOutput,
} from "@/repositories/vacancy/output.js"

import type { VacancyRepository } from "../types.js"

import { z } from "zod"
import { VacancyDTOSchema } from "@/models/vacancy"

export function createSqliteVacancyRepository(
  database: Database,
): VacancyRepository {
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
  }

  loadAll(jobSearchId: string) {
    const metaRaw = this.loadMetaStmt.get(jobSearchId)
    if (metaRaw === undefined) return EMPTY_VACANCY_LIST_OUTPUT
    const meta = z
      .object({ generated_at: z.string(), latest_crawl: z.string() })
      .parse(metaRaw)

    const vacancies = this.loadAllStmt
      .all(jobSearchId)
      .map((raw) => hydrateVacancyRow(raw))

    return {
      generatedAt: meta.generated_at,
      latestCrawl: meta.latest_crawl,
      vacancies,
    }
  }

  save(jobSearchId: string, vacancies: Vacancy[], latestCrawl: string): void {
    const output = createVacancyListOutput(vacancies, latestCrawl)
    const hashes = JSON.stringify(vacancies.map((v) => v.hash))

    this.database.transaction(() => {
      this.upsertMetaStmt.run(
        jobSearchId,
        output.generatedAt,
        output.latestCrawl,
      )
      this.deleteStaleVacanciesStmt.run(jobSearchId, hashes)
      for (const vacancy of vacancies) {
        this.upsertVacancyStmt.run(
          jobSearchId,
          vacancy.hash,
          JSON.stringify(vacancy),
        )
      }
    })
  }

  findByHash(jobSearchId: string, hash: string): Vacancy | undefined {
    const row = this.findByHashStmt.getJsonData(jobSearchId, hash)
    if (row === undefined) return undefined
    return hydrateVacancy(row)
  }

  addActivity(jobSearchId: string, hash: string, activity: Activity): void {
    const row = this.findByHashStmt.getJsonData(jobSearchId, hash)
    if (row === undefined) throw new Error(`Vacancy "${hash}" not found`)

    const vacancy = hydrateVacancy(row)
    const updated = vacancy.with({
      activityHistory: [...vacancy.activityHistory, activity],
    })

    this.updateVacancyStmt.run(JSON.stringify(updated), jobSearchId, hash)
  }

  private readonly loadMetaStmt
  private readonly loadAllStmt
  private readonly upsertMetaStmt
  private readonly deleteStaleVacanciesStmt
  private readonly upsertVacancyStmt
  private readonly findByHashStmt
  private readonly updateVacancyStmt
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

// Old commute data stored durations as strings ("1 hour 5 mins") — strip and let next enrichment recompute.
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


