import { Database } from "@/utils/index.js"

export function migrateSqliteDatabase(database: Database): void {
  const version = getUserVersion(database)
  if (version >= 1) return

  database.transaction(() => {
    database.exec(`DROP TABLE IF EXISTS applicant_draft`)
    database.exec(`DROP TABLE IF EXISTS job_search_drafts`)
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
    migrateApplicantData(database)
    migrateJobSearchData(database)
    database.exec(`PRAGMA user_version = 1`)
  })
}

function migrateApplicantData(database: Database): void {
  const rows = database
    .prepare("SELECT id, data FROM applicants")
    .all() as Array<{ id: string; data: string }>
  const update = database.prepare("UPDATE applicants SET data = ? WHERE id = ?")
  for (const row of rows) {
    const parsed = JSON.parse(row.data)
    delete parsed.id
    update.run(JSON.stringify(parsed), row.id)
  }
}

function migrateJobSearchData(database: Database): void {
  const rows = database
    .prepare("SELECT id, data FROM job_searches")
    .all() as Array<{ id: string; data: string }>
  const update = database.prepare(
    "UPDATE job_searches SET data = ? WHERE id = ?",
  )
  for (const row of rows) {
    const parsed = JSON.parse(row.data)
    delete parsed.id
    delete parsed.applicantId
    parsed.coverLetter = parsed.coverLetter ?? ""
    update.run(JSON.stringify(parsed), row.id)
  }
}

function getUserVersion(database: Database): number {
  const row = database.prepare("PRAGMA user_version").get() as
    | { user_version: number }
    | undefined
  return row?.user_version ?? 0
}
