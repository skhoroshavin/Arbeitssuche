import { JobSearchSchema } from "@/models/job-search"
import type { SearchMode } from "@/models/job-search"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"
import { JobSearchID } from "@/models/job-search"
import { ApplicantID } from "@/models/applicant"

export function registerJobSearchesHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("job-searches:list", (applicantId: string) => {
    const list = services.jobSearchRepo.listByApplicant(ApplicantID(applicantId))
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
        ApplicantID(applicantId),
        searchMode,
      )
      return { id: id.value, applicantId }
    },
  )
  handle("job-searches:load", (id: string) => {
    const { jobSearch, applicantId } = services.jobSearchRepo.load(
      JobSearchID(id),
    )
    return { jobSearch, applicantId: applicantId.value }
  })
  handle("job-searches:save", (id: string, data: unknown) => {
    const validated = JobSearchSchema.parse(data)
    services.jobSearchRepo.save(JobSearchID(id), validated)
    return { ok: true }
  })
  handle("job-searches:delete", (id: string) => {
    services.jobSearchRepo.delete(JobSearchID(id))
    return { deleted: id }
  })

  handle("job-searches:draft:load", (applicantId: string) => ({
    draft: services.jobSearchRepo.loadDraft(ApplicantID(applicantId)),
  }))
  handle("job-searches:draft:save", (applicantId: string, draft: unknown) => {
    const validated = JobSearchSchema.parse(draft)
    services.jobSearchRepo.saveDraft(ApplicantID(applicantId), validated)
    return { ok: true }
  })
  handle("job-searches:draft:delete", (applicantId: string) => {
    services.jobSearchRepo.deleteDraft(ApplicantID(applicantId))
    return { deleted: applicantId }
  })
  handle("job-searches:draft:finalize", (applicantId: string) => {
    const id = services.jobSearchRepo.finalizeDraft(ApplicantID(applicantId))
    return { id: id.value, applicantId }
  })

  handle("job-searches:cover-letter:load", (id: string) => {
    const { jobSearch } = services.jobSearchRepo.load(JobSearchID(id))
    return { content: jobSearch.coverLetter }
  })
  handle("job-searches:cover-letter:save", (id: string, content: string) => {
    const { jobSearch, applicantId } = services.jobSearchRepo.load(JobSearchID(id))
    services.jobSearchRepo.save(JobSearchID(id), {
      ...jobSearch,
      coverLetter: content,
    })
    return { ok: true }
  })
  handle("job-searches:cover-letter:generate", (id: string) =>
    services.coverLetterWriter.generate(id),
  )
  handle("job-searches:draft:cover-letter:generate", (applicantId: string) =>
    services.coverLetterWriter.generateFromDraft(applicantId),
  )
}
