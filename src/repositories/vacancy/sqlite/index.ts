import { Database, semverGreaterThan } from "@/utils/index.js"
import { Vacancy } from "@/models/vacancy/index.js"
import type { JobSearchID } from "@/models/job-search"
import type { VacancyRepository } from "@/repositories/vacancy"

export function createSqliteVacancyRepository(
  database: Database,
): VacancyRepository {
  runVacancyMigration(database)
  database.exec(`
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

  if (semverGreaterThan("0.4.0", version)) {
    database.transaction(() => {
      migrateCoverLetters(database)
      database.exec(`DROP TABLE IF EXISTS cover_letters`)
      database.exec(`DROP TABLE IF EXISTS vacancy_meta`)
      database.exec(`
        INSERT OR REPLACE INTO _migrations (repository, version)
        VALUES ('vacancy', '0.4.0')
      `)
    })
  }
}

function migrateCoverLetters(database: Database): void {
  const tableInfo = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cover_letters'")
    .get()
  if (!tableInfo) return

  const rows = database
    .prepare("SELECT job_search_id, vacancy_hash, content FROM cover_letters")
    .all() as Array<{
    job_search_id: string
    vacancy_hash: string
    content: string
  }>

  for (const row of rows) {
    const existing = database
      .prepare("SELECT data FROM vacancies WHERE job_search_id = ? AND hash = ?")
      .get(row.job_search_id, row.vacancy_hash) as
      | { data: string }
      | undefined
    if (!existing) continue

    const data = JSON.parse(existing.data) as Record<string, unknown>
    data.coverLetter = row.content
    database
      .prepare(
        "UPDATE vacancies SET data = ? WHERE job_search_id = ? AND hash = ?",
      )
      .run(JSON.stringify(data), row.job_search_id, row.vacancy_hash)
  }
}

class SqliteVacancyRepository implements VacancyRepository {
  constructor(private readonly database: Database) {
    this.loadAllStmt = database.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ?",
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
  }

  allForJobSearch(jobSearchId: JobSearchID): Vacancy[] {
    return this.loadAllStmt
      .all(jobSearchId.value)
      .map((raw) => hydrateVacancyRow(raw))
  }

  save(jobSearchId: JobSearchID, vacancies: Vacancy[]): void {
    const hashes = JSON.stringify(vacancies.map((v) => v.hash))

    this.database.transaction(() => {
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
    return Vacancy.parse(row)
  }

  private readonly loadAllStmt
  private readonly deleteStaleVacanciesStmt
  private readonly upsertVacancyStmt
  private readonly findByHashStmt
}

function hydrateVacancyRow(row: Record<string, unknown>): Vacancy {
  if (typeof row.data !== "string") throw new Error("Invalid vacancy row")
  return Vacancy.parse(JSON.parse(row.data))
}
