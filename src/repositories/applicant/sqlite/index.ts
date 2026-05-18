import {
  type Applicant,
  type ApplicantID,
  type ApplicantInfo,
  type ApplicantPersonal,
  ApplicantID as makeApplicantID,
} from "@/models/applicant"
import {
  DEFAULT_APPLICANT,
  isMeaningfulApplicantDraftSnapshot,
  resolveApplicant,
} from "@/models/applicant/index.js"
import type { ApplicantRepository } from "../types.js"
import { Database, type Statement } from "@/utils/index.js"
import { z } from "zod"
import { ApplicantSchema } from "@/models/applicant"

const DRAFT_SENTINEL = "$draft"

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
  const repo = new SqliteApplicantRepository(database)
  repo.seedNextId()
  return repo
}

class SqliteApplicantRepository implements ApplicantRepository {
  constructor(database: Database) {
    this.database = database
    this.listStmt = database.prepare("SELECT id, name FROM applicants")
    this.loadStmt = database.prepare("SELECT data FROM applicants WHERE id = ?")
    this.updateStmt = database.prepare(
      "UPDATE applicants SET name = ?, data = ? WHERE id = ?",
    )
    this.insertStmt = database.prepare(
      "INSERT INTO applicants (id, name, data) VALUES (?, ?, ?)",
    )
    this.deleteStmt = database.prepare("DELETE FROM applicants WHERE id = ?")
  }

  seedNextId(): void {
    const result = this.database.prepare(
      "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) AS max FROM applicants WHERE id GLOB '[0-9]*'",
    ).get() as { max: number } | undefined
    this.nextId = Number(result?.max ?? 0)
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
    return resolveApplicant(ApplicantSchema.parse(applicant))
  }

  save(id: ApplicantID, data: Applicant): void {
    const resolved = resolveApplicant(data)
    const result = this.updateStmt.run(
      resolved.personal.name,
      JSON.stringify(resolved),
      id.value,
    )
    if (result.changes === 0)
      throw new Error(`Applicant "${id.value}" not found`)
  }

  delete(id: ApplicantID): void {
    this.deleteStmt.run(id.value)
  }

  saveDraft(draft: Applicant): void {
    const snapshot = resolveApplicant(draft)
    this.insertStmt.run(DRAFT_SENTINEL, snapshot.personal.name, JSON.stringify(snapshot))
  }

  finalizeDraft(): ApplicantID {
    return this.database.transaction(() => {
      const draft = this.loadDraft()
      if (!draft) throw new Error("Applicant draft not found")
      const id = this.generateId()
      const resolved = resolveApplicant(structuredClone(draft))
      this.insertStmt.run(id.value, resolved.personal.name, JSON.stringify(resolved))
      this.deleteDraft()
      return id
    })
  }

  loadDraft(): Applicant | undefined {
    const applicant = this.loadStmt.getJsonData(DRAFT_SENTINEL)
    if (applicant === undefined) return undefined
    const parsed = resolveApplicant(ApplicantSchema.parse(applicant))
    return isMeaningfulApplicantDraftSnapshot(parsed) ? parsed : undefined
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
  private readonly deleteStmt: Statement
  private nextId: number
}

function parseApplicantRow(raw: unknown): ApplicantInfo {
  const row = z
    .object({ id: z.string(), name: z.string().nullable() })
    .parse(raw)
  return { id: makeApplicantID(row.id), displayName: row.name || "" }
}
