import { DEFAULT_APPLICANT } from "@/models/applicant/constants.js"

import type {
  Address,
  Applicant,
  ApplicantDraftSnapshot,
  ApplicantEducation,
  ApplicantExperience,
} from "@/models/applicant/types.js"

import { resolveApplicant } from "@/models/applicant/resolve.js"

export function createDefaultApplicantDraftSnapshot(): ApplicantDraftSnapshot {
  return resolveApplicant(DEFAULT_APPLICANT)
}

export function isMeaningfulApplicantDraftSnapshot(
  snapshot: ApplicantDraftSnapshot,
): boolean {
  const resolved = resolveApplicantDraftSnapshot(snapshot)
  const checks = [
    hasMeaningfulPersonal(resolved),
    hasMeaningfulExperience(resolved.experience),
    hasMeaningfulEducation(resolved.education),
    hasMeaningfulSkills(resolved.skills),
    hasMeaningfulLanguages(resolved.languages),
    hasMeaningfulCertifications(resolved.certifications),
    hasMeaningfulNotes(resolved.personalNotes),
  ]
  return checks.some(Boolean)
}

export function resolveApplicantDraftSnapshot(
  snapshot: ApplicantDraftSnapshot,
): ApplicantDraftSnapshot {
  return resolveApplicant(snapshot)
}

function hasMeaningfulPersonal(applicant: Applicant): boolean {
  const { personal, disclose } = applicant
  const checks = [
    hasText(personal.name),
    hasText(personal.email),
    hasText(personal.phone),
    hasText(personal.birthdate),
    hasText(personal.gender),
    hasMeaningfulAddress(personal.address),
    personal.hobbies.some((hobby) => hasText(hobby)),
    disclose.birthdate,
    disclose.gender,
    disclose.address,
    disclose.hobbies,
  ]
  return checks.some(Boolean)
}

function hasMeaningfulAddress(address?: Address): boolean {
  if (!address) return false
  return [address.street, address.zip, address.city].some(
    (value) => value.trim().length > 0,
  )
}

function hasMeaningfulExperience(experience: ApplicantExperience[]): boolean {
  return experience.some((entry) => hasMeaningfulExperienceEntry(entry))
}

function hasMeaningfulEducation(education: ApplicantEducation[]): boolean {
  return education.some((entry) => hasMeaningfulEducationEntry(entry))
}

function hasMeaningfulSkills(skills: Applicant["skills"]): boolean {
  return skills.some(({ name }) => hasText(name))
}

function hasMeaningfulLanguages(languages: Applicant["languages"]): boolean {
  return languages.some(
    ({ language, level }) => hasText(language) || hasText(level),
  )
}

function hasMeaningfulCertifications(
  certifications: Applicant["certifications"],
): boolean {
  return certifications.some(({ name, issuer, date, description }) =>
    [name, issuer, date, description].some((value) => hasText(value)),
  )
}

function hasMeaningfulNotes(notes: Applicant["personalNotes"]): boolean {
  return notes?.some((note) => hasText(note)) === true
}

function hasMeaningfulExperienceEntry({
  role,
  company,
  startDate,
  endDate,
  location,
  discloseDates,
  highlights,
}: ApplicantExperience): boolean {
  const checks = [
    hasText(role),
    hasText(company),
    hasText(startDate),
    hasText(endDate),
    hasText(location),
    discloseDates === true,
    highlights?.some((highlight) => hasText(highlight)) === true,
  ]
  return checks.some(Boolean)
}

function hasMeaningfulEducationEntry({
  institution,
  course,
  startDate,
  endDate,
  location,
  discloseDates,
  highlights,
}: ApplicantEducation): boolean {
  const checks = [
    hasText(institution),
    hasText(course),
    hasText(startDate),
    hasText(endDate),
    hasText(location),
    discloseDates === true,
    highlights?.some((highlight) => hasText(highlight)) === true,
  ]
  return checks.some(Boolean)
}

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0
}
