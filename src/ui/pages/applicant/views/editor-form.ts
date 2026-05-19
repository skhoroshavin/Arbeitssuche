import { Applicant } from "@/models/applicant"
import type {
  Address,
  ApplicantCertification,
  ApplicantLanguage,
  ApplicantSkill,
} from "@/models/applicant"

export function toApplicantFormValues(
  applicant: Applicant,
): ApplicantFormValues {
  return {
    personal: applicant.personal,
    experience: applicant.experience.map((entry) => ({
      ...entry,
      highlights: joinLines(entry.highlights),
    })),
    education: applicant.education.map((entry) => ({
      ...entry,
      highlights: joinLines(entry.highlights),
    })),
    skills: applicant.skills,
    languages: applicant.languages,
    certifications: applicant.certifications,
    personalNotes: applicant.personalNotes,
  }
}

export function fromApplicantFormValues(form: ApplicantFormValues): Applicant {
  const applicant = new Applicant()
  applicant.personal = { ...form.personal }
  applicant.experience = form.experience.map((entry) => ({
    ...entry,
    highlights: splitLines(entry.highlights) ?? [],
  }))
  applicant.education = form.education.map((entry) => ({
    ...entry,
    highlights: splitLines(entry.highlights) ?? [],
  }))
  applicant.skills = form.skills
  applicant.languages = form.languages
  applicant.certifications = form.certifications
  applicant.personalNotes = form.personalNotes
  return applicant
}

export interface ApplicantFormValues {
  personal: ApplicantFormPersonal
  experience: ApplicantFormExperience[]
  education: ApplicantFormEducation[]
  skills: ApplicantSkill[]
  languages: ApplicantLanguage[]
  certifications: ApplicantCertification[]
  personalNotes: string
}

interface ApplicantFormExperience {
  role: string
  company: string
  startDate: string
  endDate: string
  location: string
  discloseDates: boolean
  highlights?: string
}

interface ApplicantFormEducation {
  institution: string
  course: string
  startDate: string
  endDate: string
  location: string
  discloseDates: boolean
  highlights?: string
}

interface ApplicantFormPersonal {
  name: string
  email: string
  phone: string
  birthdate: string
  gender: string
  address: Address
  hobbies: string
  discloseBirthdate: boolean
  discloseGender: boolean
  discloseAddress: boolean
  discloseHobbies: boolean
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
