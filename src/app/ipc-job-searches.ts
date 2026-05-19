import { JobSearch, type SearchMode } from "@/models/job-search"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"
import { makeJobSearchID } from "@/models/job-search"
import { makeApplicantID } from "@/models/applicant"

export function registerJobSearchesHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("job-searches:list", (applicantId: string) => {
    const list = services.jobSearchRepo.listByApplicant(
      makeApplicantID(applicantId),
    )
    return {
      jobSearches: list.map((info) => ({
        id: info.id.value,
        displayName: info.displayName,
      })),
    }
  })
  handle(
    "job-searches:create",
    (searchTerm: string, applicantId: string, searchMode?: SearchMode) => {
      const id = services.jobSearchRepo.create(
        searchTerm,
        makeApplicantID(applicantId),
        searchMode,
      )
      return { id: id.value, applicantId }
    },
  )
  handle("job-searches:load", (id: string) => {
    const { jobSearch, applicantId } = services.jobSearchRepo.load(
      makeJobSearchID(id),
    )
    return { jobSearch, applicantId: applicantId.value }
  })
  handle("job-searches:save", (id: string, data: unknown) => {
    const validated = JobSearch.parse(data)
    services.jobSearchRepo.save(makeJobSearchID(id), validated)
    return { ok: true }
  })
  handle("job-searches:delete", (id: string) => {
    services.jobSearchRepo.delete(makeJobSearchID(id))
    return { deleted: id }
  })

  handle("job-searches:draft:load", (applicantId: string) => ({
    draft: services.jobSearchRepo.loadDraft(makeApplicantID(applicantId)),
  }))
  handle("job-searches:draft:save", (applicantId: string, draft: unknown) => {
    const validated = JobSearch.parse(draft)
    services.jobSearchRepo.saveDraft(makeApplicantID(applicantId), validated)
    return { ok: true }
  })
  handle("job-searches:draft:delete", (applicantId: string) => {
    services.jobSearchRepo.deleteDraft(makeApplicantID(applicantId))
    return { deleted: applicantId }
  })
  handle("job-searches:draft:finalize", (applicantId: string) => {
    const id = services.jobSearchRepo.finalizeDraft(
      makeApplicantID(applicantId),
    )
    return { id: id.value, applicantId }
  })

  handle("job-searches:cover-letter:load", (id: string) => {
    const { jobSearch } = services.jobSearchRepo.load(makeJobSearchID(id))
    return { content: jobSearch.coverLetter }
  })
  handle("job-searches:cover-letter:save", (id: string, content: string) => {
    const { jobSearch } = services.jobSearchRepo.load(makeJobSearchID(id))
    jobSearch.coverLetter = content
    services.jobSearchRepo.save(makeJobSearchID(id), jobSearch)
    return { ok: true }
  })
  handle("job-searches:cover-letter:generate", (id: string) =>
    services.coverLetterWriter.generate(id),
  )
  handle("job-searches:draft:cover-letter:generate", (applicantId: string) =>
    services.coverLetterWriter.generateFromDraft(applicantId),
  )
}
