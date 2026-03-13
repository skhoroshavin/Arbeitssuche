import { Database, queryRow, queryRows } from "@/repositories/database.js";
import type { Vacancy, Activity } from "@/models/vacancy/types.js";
import {
  createVacancyListOutput,
  type VacancyRepository,
} from "@/repositories/vacancy/types.js";

class SqliteVacancyRepository implements VacancyRepository {
  private readonly loadMetaStmt;
  private readonly loadAllStmt;
  private readonly upsertMetaStmt;
  private readonly deleteStaleVacanciesStmt;
  private readonly upsertVacancyStmt;
  private readonly findByHashStmt;
  private readonly updateVacancyStmt;

  constructor(private readonly db: Database) {
    this.loadMetaStmt = db.prepare(
      "SELECT generated_at, latest_crawl FROM vacancy_meta WHERE job_search_id = ?",
    );
    this.loadAllStmt = db.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ?",
    );
    this.upsertMetaStmt = db.prepare(
      "INSERT OR REPLACE INTO vacancy_meta (job_search_id, generated_at, latest_crawl) VALUES (?, ?, ?)",
    );
    this.deleteStaleVacanciesStmt = db.prepare(
      "DELETE FROM vacancies WHERE job_search_id = ? AND hash NOT IN (SELECT value FROM json_each(?))",
    );
    this.upsertVacancyStmt = db.prepare(
      "INSERT OR REPLACE INTO vacancies (job_search_id, hash, data) VALUES (?, ?, ?)",
    );
    this.findByHashStmt = db.prepare(
      "SELECT data FROM vacancies WHERE job_search_id = ? AND hash = ?",
    );
    this.updateVacancyStmt = db.prepare(
      "UPDATE vacancies SET data = ? WHERE job_search_id = ? AND hash = ?",
    );
  }

  loadAll(jobSearchId: string) {
    const meta = queryRow<{ generated_at: string; latest_crawl: string }>(
      this.loadMetaStmt,
      jobSearchId,
    );
    if (!meta) return undefined;

    const rows = queryRows<{ data: string }>(this.loadAllStmt, jobSearchId);
    const vacancies = rows.map((r): Vacancy => JSON.parse(r.data));

    return {
      generatedAt: meta.generated_at,
      latestCrawl: meta.latest_crawl,
      count: vacancies.length,
      vacancies,
    };
  }

  save(jobSearchId: string, vacancies: Vacancy[], latestCrawl: string): void {
    const output = createVacancyListOutput(vacancies, latestCrawl);

    const hashes = JSON.stringify(vacancies.map((v) => v.hash));

    this.db.transaction(() => {
      this.upsertMetaStmt.run(
        jobSearchId,
        output.generatedAt,
        output.latestCrawl,
      );
      this.deleteStaleVacanciesStmt.run(jobSearchId, hashes);
      for (const vacancy of vacancies) {
        this.upsertVacancyStmt.run(
          jobSearchId,
          vacancy.hash,
          JSON.stringify(vacancy),
        );
      }
    });
  }

  findByHash(jobSearchId: string, hash: string): Vacancy | undefined {
    const row = queryRow<{ data: string }>(
      this.findByHashStmt,
      jobSearchId,
      hash,
    );
    return row ? JSON.parse(row.data) : undefined;
  }

  async addActivity(
    jobSearchId: string,
    hash: string,
    activity: Activity,
  ): Promise<void> {
    const row = queryRow<{ data: string }>(
      this.findByHashStmt,
      jobSearchId,
      hash,
    );
    if (!row) throw new Error(`Vacancy "${hash}" not found`);

    const vacancy: Vacancy = JSON.parse(row.data);
    vacancy.activityHistory.push(activity);

    this.updateVacancyStmt.run(JSON.stringify(vacancy), jobSearchId, hash);
  }
}

export function createSqliteVacancyRepository(db: Database): VacancyRepository {
  db.exec(`
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
  `);
  return new SqliteVacancyRepository(db);
}
