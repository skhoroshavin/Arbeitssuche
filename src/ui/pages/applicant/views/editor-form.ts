import { DEFAULT_APPLICANT } from "@/models/applicant"
import type {
  Address,
  Applicant,
  ApplicantCertification,
  ApplicantDisclose,
  ApplicantLanguage,
  ApplicantSkill,
} from "@/models/applicant/types"

export function toApplicantFormValues(
  applicant: Applicant,
): ApplicantFormValues {
  return {
    ...applicant,
    personal: {
      ...applicant.personal,
      hobbies: arrayToString(applicant.personal.hobbies),
    },
    experience: applicant.experience.map((entry) => ({
      ...entry,
      highlights: arrayToString(entry.highlights),
    })),
    education: applicant.education.map((entry) => ({
      ...entry,
      highlights: arrayToString(entry.highlights),
    })),
    personalNotes: arrayToString(applicant.personalNotes),
  }
}

export function fromApplicantFormValues(form: ApplicantFormValues): Applicant {
  return {
    ...form,
    disclose: form.disclose ?? DEFAULT_APPLICANT.disclose,
    personal: {
      ...form.personal,
      hobbies: stringToArray(form.personal.hobbies) ?? [],
    },
    experience: form.experience.map((entry) => ({
      ...entry,
      highlights: stringToArray(entry.highlights),
    })),
    education: form.education.map((entry) => ({
      ...entry,
      highlights: stringToArray(entry.highlights),
    })),
    personalNotes: stringToArray(form.personalNotes),
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

export interface ApplicantFormExperience {
  role: string
  company: string
  startDate: string
  endDate: string
  location?: string
  discloseDates?: boolean
  highlights?: string
}

export interface ApplicantFormEducation {
  institution: string
  course: string
  startDate?: string
  endDate?: string
  location?: string
  discloseDates?: boolean
  highlights?: string
}

export interface ApplicantFormPersonal {
  name: string
  email?: string
  phone?: string
  birthdate?: string
  gender?: string
  address?: Address
  hobbies?: string
}

function arrayToString(array: string[] | undefined): string | undefined {
  return array?.join("\n")
}

function stringToArray(value: string | undefined): string[] | undefined {
  return value
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}
