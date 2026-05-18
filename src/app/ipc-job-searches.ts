import {
  JobSearchSchema,
  JobSearchEditorSnapshotSchema,
} from "@/models/job-search"
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
    return { jobSearches: list }
  })
  handle(
    "job-searches:create",
    (searchTerm: string, applicantId: string, searchMode?: SearchMode) => {
      const id = services.jobSearchRepo.create(
        searchTerm,
        applicantId,
        searchMode,
      )
      return { id, applicantId }
    },
  )
  handle("job-searches:load", (id: string) => services.jobSearchRepo.load(id))
  handle("job-searches:save", (id: string, data: unknown) => {
    const validated = JobSearchSchema.parse(data)
    services.jobSearchRepo.save(id, validated)
    return { ok: true as const }
  })
  handle("job-searches:delete", (id: string) => {
    services.jobSearchRepo.delete(id)
    return { deleted: id }
  })

  handle("job-searches:draft:load", (applicantId: string) => ({
    draft: services.jobSearchRepo.loadDraft(applicantId),
  }))
  handle("job-searches:draft:save", (applicantId: string, draft: unknown) => {
    const validated = JobSearchEditorSnapshotSchema.parse(draft)
    services.jobSearchRepo.saveDraft(applicantId, validated)
    return { ok: true as const }
  })
  handle("job-searches:draft:delete", (applicantId: string) => {
    services.jobSearchRepo.deleteDraft(applicantId)
    return { deleted: applicantId }
  })
  handle("job-searches:draft:finalize", (applicantId: string) => {
    const id = services.jobSearchRepo.finalizeDraft(applicantId)
    return { id, applicantId }
  })

  handle("job-searches:cover-letter:load", (id: string) => ({
    content: services.jobSearchRepo.loadApplicationCoverLetter(id, ""),
  }))
  handle("job-searches:cover-letter:save", (id: string, content: string) => {
    services.jobSearchRepo.saveApplicationCoverLetter(id, "", content)
    return { ok: true as const }
  })
  handle("job-searches:cover-letter:generate", async (id: string) => ({
    content: await services.coverLetterWriter.generate(id),
  }))
  handle(
    "job-searches:draft:cover-letter:generate",
    async (applicantId: string) => ({
      content: await services.coverLetterWriter.generateFromDraft(applicantId),
    }),
  )
}
