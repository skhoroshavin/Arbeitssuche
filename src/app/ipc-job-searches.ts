import {
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
  JobSearchListResponseSchema,
  CreatedJobSearchIdSchema,
  SavedOkSchema,
  DeletedIdSchema,
  JobSearchDraftResponseSchema,
  ContentSchema,
} from "@/api"
import type { SearchMode } from "@/models/job-search"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"

export function registerJobSearchesHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("job-searches:list", (applicantId?: string) => {
    const list = applicantId
      ? services.jobSearchRepo.listByApplicant(applicantId)
      : services.jobSearchRepo.list()
    return JobSearchListResponseSchema.parse({ jobSearches: list })
  })
  handle(
    "job-searches:create",
    (searchTerm: string, applicantId: string, searchMode?: SearchMode) => {
      const id = services.jobSearchRepo.create(
        searchTerm,
        applicantId,
        searchMode,
      )
      return CreatedJobSearchIdSchema.parse({ id, applicantId })
    },
  )
  handle("job-searches:load", (id: string) =>
    JobSearchSchema.parse(services.jobSearchRepo.load(id)),
  )
  handle("job-searches:save", (id: string, data: unknown) => {
    const validated = JobSearchSchema.parse(data)
    services.jobSearchRepo.save(id, validated)
    return SavedOkSchema.parse({ ok: true })
  })
  handle("job-searches:delete", (id: string) => {
    services.jobSearchRepo.delete(id)
    return DeletedIdSchema.parse({ deleted: id })
  })

  handle("job-searches:draft:load", (applicantId: string) =>
    JobSearchDraftResponseSchema.parse({
      draft: services.jobSearchRepo.loadDraft(applicantId),
    }),
  )
  handle("job-searches:draft:save", (applicantId: string, draft: unknown) => {
    const validated = JobSearchEditorSnapshotSchema.parse(draft)
    services.jobSearchRepo.saveDraft(applicantId, validated)
    return SavedOkSchema.parse({ ok: true })
  })
  handle("job-searches:draft:delete", (applicantId: string) => {
    services.jobSearchRepo.deleteDraft(applicantId)
    return DeletedIdSchema.parse({ deleted: applicantId })
  })
  handle("job-searches:draft:finalize", (applicantId: string) => {
    const id = services.jobSearchRepo.finalizeDraft(applicantId)
    return CreatedJobSearchIdSchema.parse({ id, applicantId })
  })

  // Cover letter
  handle("job-searches:cover-letter:load", (id: string) =>
    ContentSchema.parse({
      content: services.jobSearchRepo.loadApplicationCoverLetter(id, ""),
    }),
  )
  handle("job-searches:cover-letter:save", (id: string, content: string) => {
    services.jobSearchRepo.saveApplicationCoverLetter(id, "", content)
    return SavedOkSchema.parse({ ok: true })
  })
  handle("job-searches:cover-letter:generate", async (id: string) =>
    ContentSchema.parse(await services.coverLetterWriter.generate(id)),
  )
  handle(
    "job-searches:draft:cover-letter:generate",
    async (applicantId: string) =>
      ContentSchema.parse(
        await services.coverLetterWriter.generateFromDraft(applicantId),
      ),
  )
}
