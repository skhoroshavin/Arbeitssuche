import type { Applicant } from "@/models/applicant/types.js";
import type { AppServices } from "@/app/index.js";
import type { IpcHandle } from "./index.js";

export function registerApplicantsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("applicants:list", () => ({
    applicants: services.applicantRepo.list(),
  }));
  handle("applicants:create", (name: string) => {
    const id = services.applicantRepo.create(name);
    return { id };
  });
  handle("applicants:load", (id: string) => services.applicantRepo.load(id));
  handle("applicants:save", (id: string, data: Applicant) => {
    services.applicantRepo.save(id, data);
    return { ok: true };
  });
  handle("applicants:delete", (id: string) => {
    services.applicantRepo.delete(id);
    return { deleted: id };
  });
  handle("applicants:resume", (id: string, template: string) =>
    services.resumeRenderer.generate(id, template),
  );
  handle("applicants:consult-searches", (id: string) =>
    services.jobConsultant.consult(id),
  );
}
