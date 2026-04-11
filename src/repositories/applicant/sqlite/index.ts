import type { StatementSync } from "node:sqlite"
import {
  type Applicant,
  type ApplicantDraft,
  type ApplicantDraftSnapshot,
  type ApplicantInfo,
  type ApplicantPersonal,
} from "@/models/applicant/types.js"
import {
  DEFAULT_APPLICANT,
  isMeaningfulApplicantDraftSnapshot,
  resolveApplicant,
} from "@/models/applicant/index.js"
import {
  loadFinalizedApplicantDraft,
  type ApplicantRepository,
} from "@/repositories/applicant/types.js"
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
    );

    CREATE TABLE IF NOT EXISTS applicant_draft (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      meaningful INTEGER NOT NULL
    )
  `)
  return new SqliteApplicantRepository(database)
}

class SqliteApplicantRepository implements ApplicantRepository {
  constructor(database: Database) {
    this.database = database
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
    this.loadDraftStmt = database.prepare(
      "SELECT data, meaningful FROM applicant_draft WHERE id = 1",
    )
    this.saveDraftStmt = database.prepare(
      "INSERT OR REPLACE INTO applicant_draft (id, data, meaningful) VALUES (1, ?, ?)",
    )
    this.deleteDraftStmt = database.prepare(
      "DELETE FROM applicant_draft WHERE id = 1",
    )
  }

  list(): ApplicantInfo[] {
    return this.listStmt.all().map((row) => parseApplicantRow(row))
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

  delete(id: string): void {
    this.deleteStmt.run(id)
  }

  saveDraft(draft: ApplicantDraftSnapshot): void {
    const snapshot = resolveApplicant(draft)
    const meaningful = isMeaningfulApplicantDraftSnapshot(snapshot)
    this.saveDraftStmt.run(JSON.stringify(snapshot), meaningful ? 1 : 0)
  }

  finalizeDraft(): string {
    return this.database.transaction(() => {
      return loadFinalizedApplicantDraft({
        draft: this.loadDraft(),
        getSnapshot: (draft) => draft.snapshot,
        exists: (candidate) => this.exists(candidate),
        persist: ({ id, data }) => {
          this.insertStmt.run(id, data.personal.name, JSON.stringify(data))
        },
        clearDraft: () => {
          this.deleteDraft()
        },
      })
    })
  }

  exists(id: string): boolean {
    return this.existsStmt.get(id) !== undefined
  }

  loadDraft(): ApplicantDraft | undefined {
    const raw = this.loadDraftStmt.get()
    if (raw === undefined) return undefined
    const parsed = typia.assert<ApplicantDraftRow>(raw)
    const snapshot = resolveApplicant(
      typia.assert<ApplicantDraftSnapshot>(JSON.parse(parsed.data)),
    )
    return {
      snapshot,
      meaningful: parsed.meaningful === 1,
    }
  }

  deleteDraft(): void {
    this.deleteDraftStmt.run()
  }

  private readonly database: Database
  private readonly listStmt: StatementSync
  private readonly existsStmt: StatementSync
  private readonly loadStmt: StatementSync
  private readonly updateStmt: StatementSync
  private readonly insertStmt: StatementSync
  private readonly deleteStmt: StatementSync
  private readonly loadDraftStmt: StatementSync
  private readonly saveDraftStmt: StatementSync
  private readonly deleteDraftStmt: StatementSync
}

function parseApplicantRow(raw: unknown): ApplicantInfo {
  const row = typia.assert<ApplicantRow>(raw)
  return { id: row.id, name: row.name || undefined }
}

interface ApplicantRow {
  id: string
  name: string | null
}

interface ApplicantDraftRow {
  data: string
  meaningful: number
}
