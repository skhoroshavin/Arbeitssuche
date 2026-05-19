import { Database } from "@/utils/index.js"

import { z } from "zod"

export function migrateSqliteDatabase(database: Database): void {
  const version = getUserVersion(database)
  if (version >= 1) return

  database.transaction(() => {
    database.exec(`DROP TABLE IF EXISTS applicant_draft`)
    database.exec(`DROP TABLE IF EXISTS job_search_drafts`)

    if (tableExists(database, "job_searches")) {
      database.exec(
        `ALTER TABLE job_searches ADD COLUMN cover_letter TEXT NOT NULL DEFAULT ''`,
      )
      database.exec(`
        UPDATE job_searches
        SET cover_letter = COALESCE((
          SELECT content FROM cover_letters
          WHERE cover_letters.job_search_id = job_searches.id
            AND cover_letters.vacancy_hash = ''
        ), '')
      `)
      database.exec(`DELETE FROM cover_letters WHERE vacancy_hash = ''`)
    }

    if (tableExists(database, "applicants")) {
      migrateApplicantData(database)
    }

    if (tableExists(database, "job_searches")) {
      migrateJobSearchData(database)
    }

    database.exec(`PRAGMA user_version = 1`)
  })
}

function migrateApplicantData(database: Database): void {
  const rawRows = database.prepare("SELECT id, data FROM applicants").all()
  const rows = z.array(RowSchema).parse(rawRows)
  const update = database.prepare("UPDATE applicants SET data = ? WHERE id = ?")
  for (const row of rows) {
    const parsed = parseJsonObject(row.data)
    delete parsed.id
    update.run(JSON.stringify(parsed), row.id)
  }
}

function migrateJobSearchData(database: Database): void {
  const rawRows = database.prepare("SELECT id, data FROM job_searches").all()
  const rows = z.array(RowSchema).parse(rawRows)
  const update = database.prepare(
    "UPDATE job_searches SET data = ? WHERE id = ?",
  )
  for (const row of rows) {
    const parsed = parseJsonObject(row.data)
    delete parsed.id
    delete parsed.applicantId
    parsed.coverLetter =
      typeof parsed.coverLetter === "string" ? parsed.coverLetter : ""
    update.run(JSON.stringify(parsed), row.id)
  }
}

function getUserVersion(database: Database): number {
  const raw = database.prepare("PRAGMA user_version").get()
  const parsed = z.object({ user_version: z.number() }).safeParse(raw)
  return parsed.success ? parsed.data.user_version : 0
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected JSON object")
  }
  const result: Record<string, unknown> = {}
  for (const [key, value_] of Object.entries(parsed)) {
    result[key] = value_
  }
  return result
}

function tableExists(database: Database, name: string): boolean {
  const row = database
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name)
  return row !== undefined
}

const RowSchema = z.object({ id: z.string(), data: z.string() })
