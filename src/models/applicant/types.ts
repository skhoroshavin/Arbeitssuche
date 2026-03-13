import type { Address } from "@/models/config.js";

export interface ApplicantPersonal {
  name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  gender?: string;
  address?: Address;
  hobbies?: string[];
}

export interface ApplicantExperience {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  location?: string;
  discloseDates?: boolean;
  highlights?: string[];
}

export interface ApplicantEducation {
  institution: string;
  course: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  discloseDates?: boolean;
  highlights?: string[];
}

export interface ApplicantSkill {
  name: string;
}

export interface ApplicantLanguage {
  language: string;
  level: string;
}

export interface ApplicantCertification {
  name: string;
  issuer?: string;
  date?: string;
  discloseDates?: boolean;
  description?: string;
}

export interface ApplicantDisclose {
  birthdate?: boolean;
  gender?: boolean;
  address?: boolean;
  hobbies?: boolean;
}

export interface Applicant {
  id: string;
  personal: ApplicantPersonal;
  disclose?: ApplicantDisclose;
  experience: ApplicantExperience[];
  education: ApplicantEducation[];
  skills: ApplicantSkill[];
  languages: ApplicantLanguage[];
  certifications: ApplicantCertification[];
  personalNotes?: string[];
}

export interface ApplicantInfo {
  id: string;
  name?: string;
}

export const RESUME_TEMPLATES = [
  "resume_classic",
  "resume_modern",
  "resume_elegant",
  "resume_minimal",
] as const;
export type ResumeTemplate = (typeof RESUME_TEMPLATES)[number];

export const DEFAULT_APPLICANT: Applicant = {
  id: "",
  personal: { name: "" },
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
};
