import {
  DEFAULT_SEARCH_PARAMS,
  DEFAULT_PREFERENCES,
  type JobSearch,
  type JobSearchInfo,
  type SearchMode,
} from "@/models/job-search/types.js";
import type { JobSearchRepository } from "@/repositories/job-search/types.js";
import { deriveId } from "@/utils/derive-id.js";
import { Database, queryRow, queryRows } from "@/utils/database.js";

type JobSearchRow = { id: string; applicant_id: string; search_term: string };

function mapRow(r: JobSearchRow): JobSearchInfo {
  return { id: r.id, applicantId: r.applicant_id, searchTerm: r.search_term };
}

class SqliteJobSearchRepository implements JobSearchRepository {
  private readonly listStmt;
  private readonly listByApplicantStmt;
  private readonly existsStmt;
  private readonly loadStmt;
  private readonly updateStmt;
  private readonly insertStmt;
  private readonly deleteStmt;
  private readonly loadCoverLetterStmt;
  private readonly saveCoverLetterStmt;

  constructor(db: Database) {
    this.listStmt = db.prepare(
      "SELECT id, applicant_id, search_term FROM job_searches",
    );
    this.listByApplicantStmt = db.prepare(
      "SELECT id, applicant_id, search_term FROM job_searches WHERE applicant_id = ?",
    );
    this.existsStmt = db.prepare("SELECT 1 FROM job_searches WHERE id = ?");
    this.loadStmt = db.prepare("SELECT data FROM job_searches WHERE id = ?");
    this.updateStmt = db.prepare(
      "UPDATE job_searches SET applicant_id = ?, search_term = ?, data = ? WHERE id = ?",
    );
    this.insertStmt = db.prepare(
      "INSERT INTO job_searches (id, applicant_id, search_term, data) VALUES (?, ?, ?, ?)",
    );
    this.deleteStmt = db.prepare("DELETE FROM job_searches WHERE id = ?");
    this.loadCoverLetterStmt = db.prepare(
      "SELECT content FROM cover_letters WHERE job_search_id = ? AND vacancy_hash = ?",
    );
    this.saveCoverLetterStmt = db.prepare(
      "INSERT OR REPLACE INTO cover_letters (job_search_id, vacancy_hash, content) VALUES (?, ?, ?)",
    );
  }

  list(): JobSearchInfo[] {
    return queryRows<JobSearchRow>(this.listStmt).map(mapRow);
  }

  listByApplicant(applicantId: string): JobSearchInfo[] {
    return queryRows<JobSearchRow>(this.listByApplicantStmt, applicantId).map(
      mapRow,
    );
  }

  exists(id: string): boolean {
    return this.existsStmt.get(id) !== undefined;
  }

  load(id: string): JobSearch {
    const row = queryRow<{ data: string }>(this.loadStmt, id);
    if (!row) throw new Error(`Job search "${id}" not found`);
    return JSON.parse(row.data);
  }

  async save(id: string, data: JobSearch) {
    const result = this.updateStmt.run(
      data.applicantId,
      data.params.searchTerm,
      JSON.stringify(data),
      id,
    );
    if (result.changes === 0) throw new Error(`Job search "${id}" not found`);
  }

  create(
    searchTerm: string,
    applicantId: string,
    searchMode?: SearchMode,
  ): string {
    for (let i = 0; i < 5; i++) {
      const id = deriveId(searchTerm);
      if (!this.exists(id)) {
        const params = { ...DEFAULT_SEARCH_PARAMS, searchTerm };
        if (searchMode) params.searchMode = searchMode;
        const data: JobSearch = {
          id,
          applicantId,
          params,
          preferences: { ...DEFAULT_PREFERENCES },
        };
        this.insertStmt.run(id, applicantId, searchTerm, JSON.stringify(data));
        return id;
      }
    }
    throw new Error("Failed to generate unique id after 5 attempts");
  }

  delete(id: string): void {
    this.deleteStmt.run(id);
  }

  loadCoverLetter(id: string): string | undefined {
    const row = queryRow<{ content: string }>(this.loadCoverLetterStmt, id, "");
    return row?.content;
  }

  async saveCoverLetter(id: string, coverLetter: string) {
    this.saveCoverLetterStmt.run(id, "", coverLetter);
  }

  loadApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
  ): string | undefined {
    const row = queryRow<{ content: string }>(
      this.loadCoverLetterStmt,
      jobSearchId,
      vacancyHash,
    );
    return row?.content;
  }

  async saveApplicationCoverLetter(
    jobSearchId: string,
    vacancyHash: string,
    content: string,
  ): Promise<void> {
    this.saveCoverLetterStmt.run(jobSearchId, vacancyHash, content);
  }
}

export function createSqliteJobSearchRepository(
  db: Database,
): JobSearchRepository {
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_job_searches_applicant ON job_searches(applicant_id)
  `);
  return new SqliteJobSearchRepository(db);
}
