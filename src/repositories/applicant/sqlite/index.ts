import {
  type ApplicantPersonal,
  type Applicant,
  type ApplicantInfo,
} from "@/models/applicant/types.js"
import {
  DEFAULT_APPLICANT,
  resolveApplicant,
} from "@/models/applicant/index.js"
import type { ApplicantRepository } from "@/repositories/applicant/types.js"
import {
  Database,
  createUniqueDerivedId,
  parseRow,
} from "@/utils/node/index.js"
import typia from "typia"

export function createSqliteApplicantRepository(
  database: Database,
): ApplicantRepository {
  database.exec(`
    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY,
      name TEXT,
      data TEXT NOT NULL
    )
  `)
  return new SqliteApplicantRepository(database)
}

class SqliteApplicantRepository implements ApplicantRepository {
  constructor(database: Database) {
    this.listStmt = database.prepare("SELECT id, name FROM applicants")
    this.existsStmt = database.prepare("SELECT 1 FROM applicants WHERE id = ?")
    this.loadStmt = database.prepare("SELECT data FROM applicants WHERE id = ?")
    this.updateStmt = database.prepare(
      "UPDATE applicants SET name = ?, data = ? WHERE id = ?",
    )
    this.insertStmt = database.prepare(
      "INSERT INTO applicants (id, name, data) VALUES (?, ?, ?)",
    )
    this.deleteStmt = database.prepare("DELETE FROM applicants WHERE id = ?")
  }

  list(): ApplicantInfo[] {
    return this.listStmt.all().map((row) => parseApplicantRow(row))
  }

  create(name: string): string {
    const id = createUniqueDerivedId(name, (id) => this.exists(id))
    const personal: ApplicantPersonal = {
      ...DEFAULT_APPLICANT.personal,
      name,
    }
    const data = resolveApplicant({ ...DEFAULT_APPLICANT, id, personal })
    this.insertStmt.run(id, name, JSON.stringify(data))
    return id
  }

  exists(id: string): boolean {
    return this.existsStmt.get(id) !== undefined
  }

  load(id: string): Applicant {
    const applicant = parseRow(this.loadStmt.get(id))
    if (applicant === undefined) throw new Error(`Applicant "${id}" not found`)
    return resolveApplicant(typia.assert<Applicant>(applicant))
  }

  save(id: string, data: Applicant): void {
    const resolved = resolveApplicant(data)
    const result = this.updateStmt.run(
      resolved.personal.name,
      JSON.stringify(resolved),
      id,
    )
    if (result.changes === 0) throw new Error(`Applicant "${id}" not found`)
  }

  delete(id: string): void {
    this.deleteStmt.run(id)
  }

  private readonly listStmt
  private readonly existsStmt
  private readonly loadStmt
  private readonly updateStmt
  private readonly insertStmt
  private readonly deleteStmt
}

function parseApplicantRow(raw: unknown): ApplicantInfo {
  const r = typia.assert<{ id: string; name: string | null }>(raw)
  return { id: r.id, name: r.name || undefined }
}
