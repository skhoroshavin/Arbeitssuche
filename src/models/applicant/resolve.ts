import type { Applicant, ApplicantPersonal } from "@/models/applicant"
import { DEFAULT_APPLICANT } from "@/models/applicant/constants.js"

export function resolveApplicant(data: ApplicantInput): Applicant {
  return {
    personal: resolveApplicantPersonal(data.personal),
    disclose: { ...DEFAULT_APPLICANT.disclose, ...data.disclose },
    experience: data.experience ?? [],
    education: data.education ?? [],
    skills: data.skills ?? [],
    languages: data.languages ?? [],
    certifications: data.certifications ?? [],
    personalNotes: data.personalNotes ?? "",
  }
}

interface ApplicantInput extends Omit<Partial<Applicant>, "personal"> {
  personal?: Partial<ApplicantPersonal>
}

function resolveApplicantPersonal(
  personal?: Partial<ApplicantPersonal>,
): ApplicantPersonal {
  return {
    ...DEFAULT_APPLICANT.personal,
    ...personal,
    hobbies: personal?.hobbies ?? [],
  }
}
