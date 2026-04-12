import type { Applicant, ApplicantDraftSnapshot } from "@/models/applicant"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"

export function registerApplicantsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("applicants:list", () => ({
    applicants: services.applicantRepo.list(),
  }))
  handle("applicants:create", (name: string) => {
    const id = services.applicantRepo.create(name)
    return { id }
  })
  handle("applicants:load", (id: string) => services.applicantRepo.load(id))
  handle("applicants:save", (id: string, data: Applicant) => {
    services.applicantRepo.save(id, data)
    return { ok: true }
  })
  handle("applicants:delete", (id: string) => {
    services.applicantRepo.delete(id)
    return { deleted: id }
  })
  handle("applicants:draft:load", () => {
    const draft = services.applicantRepo.loadDraft()
    return { draft }
  })
  handle("applicants:draft:save", (draft: ApplicantDraftSnapshot) => {
    services.applicantRepo.saveDraft(draft)
    return { ok: true }
  })
  handle("applicants:draft:delete", () => {
    services.applicantRepo.deleteDraft()
    return { deleted: true }
  })
  handle("applicants:draft:finalize", () => {
    const id = services.applicantRepo.finalizeDraft()
    return { id }
  })
  handle("applicants:resume", (id: string, template: string) =>
    services.resumeRenderer.generate(id, template),
  )
  handle("applicants:consult-searches", (id: string) =>
    services.jobConsultant.consult(id),
  )
}
