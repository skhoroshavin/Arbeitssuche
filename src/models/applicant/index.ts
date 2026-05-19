import type { Address } from "@/models/config"

export type { Address } from "@/models/config"

import { ApplicantID } from "./id.js"

export interface Applicant {
  personal: ApplicantPersonal
  disclose: ApplicantDisclose
  experience: ApplicantExperience[]
  education: ApplicantEducation[]
  skills: ApplicantSkill[]
  languages: ApplicantLanguage[]
  certifications: ApplicantCertification[]
  personalNotes: string
}

export interface ApplicantPersonal {
  name: string
  email?: string
  phone?: string
  birthdate?: string
  gender?: string
  address?: Address
  hobbies: string[]
}

export interface ApplicantExperience {
  role: string
  company: string
  startDate: string
  endDate: string
  location?: string
  discloseDates?: boolean
  highlights?: string[]
}

export interface ApplicantEducation {
  institution: string
  course: string
  startDate?: string
  endDate?: string
  location?: string
  discloseDates?: boolean
  highlights?: string[]
}

export interface ApplicantSkill {
  name: string
}

export interface ApplicantLanguage {
  language: string
  level: string
}

export interface ApplicantCertification {
  name: string
  issuer?: string
  date?: string
  discloseDates?: boolean
  description?: string
}

export interface ApplicantDisclose {
  birthdate: boolean
  gender: boolean
  address: boolean
  hobbies: boolean
}

export interface ApplicantInfo {
  id: ApplicantID
  displayName: string
}

export type ResumeTemplate =
  | "resume_classic"
  | "resume_modern"
  | "resume_elegant"
  | "resume_minimal"

export { formatApplicantSections } from "./format.js"
export { resolveApplicant } from "./resolve.js"
export { DEFAULT_APPLICANT, RESUME_TEMPLATES } from "./constants.js"
export {
  createDefaultApplicantDraftSnapshot,
  isMeaningfulApplicantDraftSnapshot,
} from "./draft-snapshot.js"

export { ApplicantSchema, ApplicantInfoSchema } from "./schemas.js"

export { ApplicantID } from "./id.js"
