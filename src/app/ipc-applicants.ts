import { ApplicantSchema } from "@/models/applicant"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"
import { ApplicantID } from "@/models/applicant"

export function registerApplicantsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("applicants:list", () => ({
    applicants: services.applicantRepo.list().map((info) => ({
      id: info.id.value,
      displayName: info.displayName,
    })),
  }))
  handle("applicants:load", (id: string) =>
    services.applicantRepo.load(ApplicantID(id)),
  )
  handle("applicants:save", (id: string, data: unknown) => {
    const validated = ApplicantSchema.parse(data)
    services.applicantRepo.save(ApplicantID(id), validated)
    return { ok: true }
  })
  handle("applicants:delete", (id: string) => {
    services.applicantRepo.delete(ApplicantID(id))
    return { deleted: id }
  })
  handle("applicants:draft:load", () => ({
    draft: services.applicantRepo.loadDraft(),
  }))
  handle("applicants:draft:save", (draft: unknown) => {
    const validated = ApplicantSchema.parse(draft)
    services.applicantRepo.saveDraft(validated)
    return { ok: true }
  })
  handle("applicants:draft:delete", () => {
    services.applicantRepo.deleteDraft()
    return { ok: true }
  })
  handle("applicants:draft:finalize", () => {
    const id = services.applicantRepo.finalizeDraft()
    return { id: id.value }
  })
  handle("applicants:resume", (id: string, template: string) =>
    services.resumeRenderer.generate(id, template),
  )
  handle("applicants:consult-searches", (id: string) =>
    services.jobConsultant.consult(id).then((suggestions) => ({
      suggestions,
    })),
  )
}
