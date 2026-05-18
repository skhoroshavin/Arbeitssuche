import {
  ApplicantSchema,
  ApplicantListResponseSchema,
  CreatedIdSchema,
  SavedOkSchema,
  DeletedIdSchema,
  ApplicantDraftResponseSchema,
  SuggestionsResponseSchema,
} from "@/api"
import type { ApplicantDraftSnapshot } from "@/models/applicant"
import type { AppServices } from "."
import type { IpcHandle } from "./ipc-handlers.js"

export function registerApplicantsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("applicants:list", () =>
    ApplicantListResponseSchema.parse({
      applicants: services.applicantRepo.list(),
    }),
  )
  handle("applicants:create", (name: string) => {
    const id = services.applicantRepo.create(name)
    return CreatedIdSchema.parse({ id })
  })
  handle("applicants:load", (id: string) =>
    ApplicantSchema.parse(services.applicantRepo.load(id)),
  )
  handle("applicants:save", (id: string, data: unknown) => {
    const validated = ApplicantSchema.parse(data)
    services.applicantRepo.save(id, validated)
    return SavedOkSchema.parse({ ok: true })
  })
  handle("applicants:delete", (id: string) => {
    services.applicantRepo.delete(id)
    return DeletedIdSchema.parse({ deleted: id })
  })
  handle("applicants:draft:load", () =>
    ApplicantDraftResponseSchema.parse({
      draft: services.applicantRepo.loadDraft(),
    }),
  )
  handle("applicants:draft:save", (draft: ApplicantDraftSnapshot) => {
    services.applicantRepo.saveDraft(draft)
    return SavedOkSchema.parse({ ok: true })
  })
  handle("applicants:draft:delete", () => {
    services.applicantRepo.deleteDraft()
    return SavedOkSchema.parse({ ok: true })
  })
  handle("applicants:draft:finalize", () => {
    const id = services.applicantRepo.finalizeDraft()
    return CreatedIdSchema.parse({ id })
  })
  handle("applicants:resume", (id: string, template: string) =>
    services.resumeRenderer.generate(id, template),
  )
  handle("applicants:consult-searches", (id: string) =>
    services.jobConsultant
      .consult(id)
      .then((suggestions) => SuggestionsResponseSchema.parse({ suggestions })),
  )
}
