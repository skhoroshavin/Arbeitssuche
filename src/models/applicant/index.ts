export type { Address } from "@/models/config"

export type {
  ApplicantSkill,
  ApplicantLanguage,
  ApplicantCertification,
} from "./applicant.js"

export { Applicant } from "./applicant.js"

import type { ApplicantID } from "./id.js"

export interface ApplicantInfo {
  id: ApplicantID
  displayName: string
}

export type ResumeTemplate =
  | "resume_classic"
  | "resume_modern"
  | "resume_elegant"
  | "resume_minimal"

export const RESUME_TEMPLATES = [
  "resume_classic",
  "resume_modern",
  "resume_elegant",
  "resume_minimal",
] as const

export { makeApplicantID, type ApplicantID } from "./id.js"

import { z } from "zod"

export const ApplicantInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
})
