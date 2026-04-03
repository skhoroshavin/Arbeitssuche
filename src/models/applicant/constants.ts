import type { Applicant } from "./types.js"

export const RESUME_TEMPLATES = [
  "resume_classic",
  "resume_modern",
  "resume_elegant",
  "resume_minimal",
] as const

export const DEFAULT_APPLICANT: Applicant = {
  id: "",
  personal: { name: "", hobbies: [] },
  disclose: { birthdate: false, gender: false, address: false, hobbies: false },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
}
