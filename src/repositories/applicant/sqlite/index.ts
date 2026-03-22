import {
  DEFAULT_APPLICANT,
  type Applicant,
  type ApplicantInfo,
} from "@/models/applicant/types.js";
import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import { deriveId } from "@/utils/derive-id.js";
import { Database, queryRow, queryRows } from "@/utils/database.js";

class SqliteApplicantRepository implements ApplicantRepository {
  private readonly listStmt;
  private readonly existsStmt;
  private readonly loadStmt;
  private readonly updateStmt;
  private readonly insertStmt;
  private readonly deleteStmt;

  constructor(db: Database) {
    this.listStmt = db.prepare("SELECT id, name FROM applicants");
    this.existsStmt = db.prepare("SELECT 1 FROM applicants WHERE id = ?");
    this.loadStmt = db.prepare("SELECT data FROM applicants WHERE id = ?");
    this.updateStmt = db.prepare(
      "UPDATE applicants SET name = ?, data = ? WHERE id = ?",
    );
    this.insertStmt = db.prepare(
      "INSERT INTO applicants (id, name, data) VALUES (?, ?, ?)",
    );
    this.deleteStmt = db.prepare("DELETE FROM applicants WHERE id = ?");
  }

  list(): ApplicantInfo[] {
    const rows = queryRows<{ id: string; name: string | null }>(this.listStmt);
    return rows.map((r) => ({
      id: r.id,
      name: r.name || undefined,
    }));
  }

  exists(id: string): boolean {
    return this.existsStmt.get(id) !== undefined;
  }

  load(id: string): Applicant {
    const row = queryRow<{ data: string }>(this.loadStmt, id);
    if (!row) throw new Error(`Applicant "${id}" not found`);
    return JSON.parse(row.data);
  }

  async save(id: string, data: Applicant) {
    const result = this.updateStmt.run(
      data.personal.name || null,
      JSON.stringify(data),
      id,
    );
    if (result.changes === 0) throw new Error(`Applicant "${id}" not found`);
  }

  create(name: string): string {
    for (let i = 0; i < 5; i++) {
      const id = deriveId(name);
      if (!this.exists(id)) {
        const data = {
          ...DEFAULT_APPLICANT,
          id,
          personal: { name },
        };
        this.insertStmt.run(id, name || null, JSON.stringify(data));
        return id;
      }
    }
    throw new Error("Failed to generate unique id after 5 attempts");
  }

  delete(id: string): void {
    this.deleteStmt.run(id);
  }
}

export function createSqliteApplicantRepository(
  db: Database,
): ApplicantRepository {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY,
      name TEXT,
      data TEXT NOT NULL
    )
  `);
  return new SqliteApplicantRepository(db);
}
