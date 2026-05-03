import { DEFAULT_APPLICANT } from "@/models/applicant"
import type {
  Address,
  Applicant,
  ApplicantCertification,
  ApplicantDisclose,
  ApplicantLanguage,
  ApplicantSkill,
} from "@/models/applicant"

export function toApplicantFormValues(
  applicant: Applicant,
): ApplicantFormValues {
  return {
    ...applicant,
    personal: {
      ...applicant.personal,
      hobbies: joinLines(applicant.personal.hobbies),
    },
    experience: applicant.experience.map((entry) => ({
      ...entry,
      highlights: joinLines(entry.highlights),
    })),
    education: applicant.education.map((entry) => ({
      ...entry,
      highlights: joinLines(entry.highlights),
    })),
    personalNotes: joinLines(applicant.personalNotes),
  }
}

export function fromApplicantFormValues(form: ApplicantFormValues): Applicant {
  return {
    ...form,
    disclose: form.disclose ?? DEFAULT_APPLICANT.disclose,
    personal: {
      ...form.personal,
      hobbies: splitLines(form.personal.hobbies) ?? [],
    },
    experience: form.experience.map((entry) => ({
      ...entry,
      highlights: splitLines(entry.highlights),
    })),
    education: form.education.map((entry) => ({
      ...entry,
      highlights: splitLines(entry.highlights),
    })),
    personalNotes: splitLines(form.personalNotes),
  }
}

export interface ApplicantFormValues {
  id: string
  personal: ApplicantFormPersonal
  disclose?: ApplicantDisclose
  experience: ApplicantFormExperience[]
  education: ApplicantFormEducation[]
  skills: ApplicantSkill[]
  languages: ApplicantLanguage[]
  certifications: ApplicantCertification[]
  personalNotes?: string
}

interface ApplicantFormExperience {
  role: string
  company: string
  startDate: string
  endDate: string
  location?: string
  discloseDates?: boolean
  highlights?: string
}

interface ApplicantFormEducation {
  institution: string
  course: string
  startDate?: string
  endDate?: string
  location?: string
  discloseDates?: boolean
  highlights?: string
}

interface ApplicantFormPersonal {
  name: string
  email?: string
  phone?: string
  birthdate?: string
  gender?: string
  address?: Address
  hobbies?: string
}

function joinLines(lines: string[] | undefined): string | undefined {
  return lines?.join("\n")
}

function splitLines(value: string | undefined): string[] | undefined {
  return value
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
