import { DEFAULT_APPLICANT } from "@/models/applicant/constants.js"

import type { Applicant } from "@/models/applicant"

import { resolveApplicant } from "@/models/applicant/resolve.js"

export function createDefaultApplicantDraftSnapshot(): Applicant {
  return resolveApplicant(DEFAULT_APPLICANT)
}

export function isMeaningfulApplicantDraftSnapshot(
  snapshot: Applicant,
): boolean {
  const resolved = resolveApplicant(snapshot)
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
  return experience.some((entry) =>
    hasMeaningfulTimelineEntry({
      primary: entry.role,
      secondary: entry.company,
      startDate: entry.startDate,
      endDate: entry.endDate,
      location: entry.location,
      discloseDates: entry.discloseDates,
      highlights: entry.highlights,
    }),
  )
}

function hasMeaningfulEducation(education: ApplicantEducation[]): boolean {
  return education.some((entry) =>
    hasMeaningfulTimelineEntry({
      primary: entry.institution,
      secondary: entry.course,
      startDate: entry.startDate,
      endDate: entry.endDate,
      location: entry.location,
      discloseDates: entry.discloseDates,
      highlights: entry.highlights,
    }),
  )
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

function hasMeaningfulNotes(notes: string): boolean {
  return hasText(notes)
}

function hasMeaningfulTimelineEntry({
  primary,
  secondary,
  startDate,
  endDate,
  location,
  discloseDates,
  highlights,
}: MeaningfulTimelineEntry): boolean {
  const checks = [
    hasText(primary),
    hasText(secondary),
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

interface MeaningfulTimelineEntry {
  primary: string
  secondary: string
  startDate?: string
  endDate?: string
  location?: string
  discloseDates?: boolean
  highlights?: string[]
}

type Address = import("@/models/config").Address
type ApplicantEducation = import("@/models/applicant").ApplicantEducation
type ApplicantExperience = import("@/models/applicant").ApplicantExperience
