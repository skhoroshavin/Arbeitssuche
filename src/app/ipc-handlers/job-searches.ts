import type { JobSearch, SearchMode } from "@/models/job-search/types.js"
import type { AppServices } from "@/app/index.js"
import type { IpcHandle } from "."

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
  handle("job-searches:save", (id: string, data: JobSearch) => {
    services.jobSearchRepo.save(id, data)
    return { ok: true }
  })
  handle("job-searches:delete", (id: string) => {
    services.jobSearchRepo.delete(id)
    return { deleted: id }
  })

  // Cover letter
  handle("job-searches:cover-letter:load", (id: string) => {
    return {
      content: services.jobSearchRepo.loadApplicationCoverLetter(id, ""),
    }
  })
  handle("job-searches:cover-letter:save", (id: string, content: string) => {
    services.jobSearchRepo.saveApplicationCoverLetter(id, "", content)
    return { ok: true }
  })
  handle("job-searches:cover-letter:generate", (id: string) =>
    services.coverLetterWriter.generate(id),
  )
}
