import {
  type ApplicantID,
  type ApplicantInfo,
  Applicant,
  makeApplicantID,
} from "@/models/applicant"

import type { ApplicantRepository } from "@/repositories/applicant"

import { Database, type Statement } from "@/utils/index.js"

import { z } from "zod"

export function createSqliteApplicantRepository(
  database: Database,
): ApplicantRepository {
  runApplicantMigration(database)
  database.exec(`
    CREATE TABLE IF NOT EXISTS applicants (
      id TEXT PRIMARY KEY,
      name TEXT,
      data TEXT NOT NULL
    )
  `)
  const repo = new SqliteApplicantRepository(database)
  repo.seedNextId()
  return repo
}

function runApplicantMigration(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      repository TEXT PRIMARY KEY,
      version TEXT NOT NULL
    )
  `)

  const row = database
    .prepare("SELECT version FROM _migrations WHERE repository = ?")
    .get("applicant")
  const version =
    row && typeof row === "object" && "version" in row
      ? String(row.version)
      : "0.0.0"

  if (semverGreaterThan("0.3.0", version)) {
    database.transaction(() => {
      database.exec(`DROP TABLE IF EXISTS applicant_draft`)

      if (tableExists(database, "applicants")) {
        database.exec(`
          UPDATE applicants SET data = json_remove(data, '$.id')
          WHERE json_type(data, '$.id') IS NOT NULL
        `)
      }

      database.exec(`
        INSERT OR REPLACE INTO _migrations (repository, version)
        VALUES ('applicant', '0.3.0')
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

class SqliteApplicantRepository implements ApplicantRepository {
  constructor(database: Database) {
    this.database = database
    this.listStmt = database.prepare("SELECT id, name FROM applicants")
    this.loadStmt = database.prepare("SELECT data FROM applicants WHERE id = ?")
    this.updateStmt = database.prepare(
      "INSERT OR REPLACE INTO applicants (id, name, data) VALUES (?, ?, ?)",
    )
    this.insertStmt = database.prepare(
      "INSERT INTO applicants (id, name, data) VALUES (?, ?, ?)",
    )
    this.upsertStmt = database.prepare(
      "INSERT OR REPLACE INTO applicants (id, name, data) VALUES (?, ?, ?)",
    )
    this.deleteStmt = database.prepare("DELETE FROM applicants WHERE id = ?")
  }

  seedNextId(): void {
    const result = this.database
      .prepare(
        "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM applicants WHERE id GLOB '[0-9]*'",
      )
      .get()
    const parsed = z.object({ max: z.number() }).safeParse(result)
    this.nextId = parsed.success ? parsed.data.max : 0
  }

  list(): ApplicantInfo[] {
    return this.listStmt
      .all()
      .map((row) => parseApplicantRow(row))
      .filter((info) => info.id.value !== DRAFT_SENTINEL)
  }

  load(id: ApplicantID): Applicant {
    const applicant = this.loadStmt.getJsonData(id.value)
    if (applicant === undefined)
      throw new Error(`Applicant "${id.value}" not found`)
    return Applicant.parse(applicant)
  }

  save(id: ApplicantID, data: Applicant): void {
    const normalized = Applicant.parse(structuredClone(data))
    this.updateStmt.run(
      id.value,
      normalized.personal.name,
      JSON.stringify(normalized),
    )
  }

  delete(id: ApplicantID): void {
    this.deleteStmt.run(id.value)
  }

  saveDraft(draft: Applicant): void {
    const normalized = Applicant.parse(structuredClone(draft))
    this.upsertStmt.run(
      DRAFT_SENTINEL,
      normalized.personal.name,
      JSON.stringify(normalized),
    )
  }

  finalizeDraft(): ApplicantID {
    return this.database.transaction(() => {
      const draft = this.loadDraft()
      if (!draft) throw new Error("Applicant draft not found")
      const id = this.generateId()
      const normalized = Applicant.parse(structuredClone(draft))
      this.insertStmt.run(
        id.value,
        normalized.personal.name,
        JSON.stringify(normalized),
      )
      this.deleteDraft()
      return id
    })
  }

  loadDraft(): Applicant | undefined {
    const applicant = this.loadStmt.getJsonData(DRAFT_SENTINEL)
    if (applicant === undefined) return undefined
    const parsed = Applicant.parse(applicant)
    return parsed.isDifferentFromDefault() ? parsed : undefined
  }

  deleteDraft(): void {
    this.deleteStmt.run(DRAFT_SENTINEL)
  }

  private generateId(): ApplicantID {
    return makeApplicantID(String(++this.nextId))
  }

  private readonly database: Database
  private readonly listStmt: Statement
  private readonly loadStmt: Statement
  private readonly updateStmt: Statement
  private readonly insertStmt: Statement
  private readonly upsertStmt: Statement
  private readonly deleteStmt: Statement
  private nextId = 0
}

const DRAFT_SENTINEL = "$draft"

function parseApplicantRow(raw: unknown): ApplicantInfo {
  const row = z
    .object({ id: z.string(), name: z.string().nullable() })
    .parse(raw)
  return { id: makeApplicantID(row.id), displayName: row.name || "" }
}
