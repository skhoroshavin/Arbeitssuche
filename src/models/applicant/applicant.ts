import { z } from "zod"
import { Address } from "@/models/common"

export class Applicant {
  constructor() {
    this.personal = {
      name: "",
      email: "",
      phone: "",
      birthdate: "",
      gender: "",
      address: new Address(),
      hobbies: "",
      discloseBirthdate: false,
      discloseGender: false,
      discloseAddress: false,
      discloseHobbies: false,
    }
    this.experience = []
    this.education = []
    this.skills = []
    this.languages = []
    this.certifications = []
    this.personalNotes = ""
  }

  personal: ApplicantPersonal

  experience: ApplicantExperience[]

  education: ApplicantEducation[]

  skills: ApplicantSkill[]

  languages: ApplicantLanguage[]

  certifications: ApplicantCertification[]

  personalNotes: string

  static parse(data: unknown): Applicant {
    const parsed = ApplicantInputSchema.parse(data)
    const applicant = new Applicant()
    fillPersonal(applicant.personal, parsed.personal)
    fillDisclose(applicant.personal, parsed.disclose)
    applicant.experience = (parsed.experience ?? []).map((entry) =>
      mapExperience(entry),
    )
    applicant.education = (parsed.education ?? []).map((entry) =>
      mapEducation(entry),
    )
    applicant.skills = (parsed.skills ?? []).map((skill) => mapSkill(skill))
    applicant.languages = (parsed.languages ?? []).map((lang) =>
      mapLanguage(lang),
    )
    applicant.certifications = (parsed.certifications ?? []).map((cert) =>
      mapCertification(cert),
    )
    applicant.personalNotes = parsed.personalNotes
    return applicant
  }

  isDifferentFromDefault(): boolean {
    const { personal } = this
    const checks = [
      personal.name.trim().length > 0,
      personal.email.trim().length > 0,
      personal.phone.trim().length > 0,
      personal.birthdate.trim().length > 0,
      personal.gender.trim().length > 0,
      hasMeaningfulAddress(personal.address),
      personal.hobbies.trim().length > 0,
      personal.discloseBirthdate,
      personal.discloseGender,
      personal.discloseAddress,
      personal.discloseHobbies,
      this.experience.some((entry) => hasMeaningfulExperience(entry)),
      this.education.some((entry) => hasMeaningfulEducation(entry)),
      this.skills.some((skill) => skill.name.trim().length > 0),
      this.languages.some(
        (lang) =>
          lang.language.trim().length > 0 || lang.level.trim().length > 0,
      ),
      this.certifications.some(
        (cert) =>
          cert.name.trim().length > 0 ||
          cert.issuer.trim().length > 0 ||
          cert.date.trim().length > 0 ||
          cert.description.trim().length > 0,
      ),
      this.personalNotes.trim().length > 0,
    ]
    return checks.some(Boolean)
  }

  llmFriendlyDescription(): string {
    const sections: string[] = [this.formatPersonalSection()]

    if (this.experience.length > 0) {
      sections.push(
        `## Experience\n${this.experience
          .map((entry) => this.formatExperienceLine(entry))
          .join("\n")}`,
      )
    }
    if (this.education.length > 0) {
      sections.push(
        `## Education\n${this.education
          .map((entry) => this.formatEducationLine(entry))
          .join("\n")}`,
      )
    }
    if (this.skills.length > 0) {
      sections.push(`## Skills\n${this.skills.map((s) => s.name).join(", ")}`)
    }
    if (this.languages.length > 0) {
      sections.push(
        `## Languages\n${this.languages
          .map((lang) => `${lang.language} (${lang.level})`)
          .join(", ")}`,
      )
    }
    if (this.certifications.length > 0) {
      const lines = this.certifications.map(
        (cert) => `- ${cert.name}${cert.issuer ? ` (${cert.issuer})` : ""}`,
      )
      sections.push(`## Certifications\n${lines.join("\n")}`)
    }
    const notes = this.formatPersonalNotes()
    if (notes) sections.push(notes)

    return sections.join("\n\n")
  }

  private formatPersonalSection(): string {
    const p = this.personal
    const lines = [`Name: ${p.name}`]
    const formatted = p.address.format()
    if (formatted) {
      lines.push(`Adresse: ${formatted}`)
    }
    if (p.email.trim().length > 0) lines.push(`E-Mail: ${p.email}`)
    if (p.phone.trim().length > 0) lines.push(`Telefon: ${p.phone}`)
    return `## Applicant\n${lines.join("\n")}`
  }

  private formatExperienceLine(entry: ApplicantExperience): string {
    const highlights = entry.highlights.join("; ")
    return `- ${entry.role} bei ${entry.company} (${entry.startDate}-${entry.endDate})${highlights ? ": " + highlights : ""}`
  }

  private formatEducationLine(entry: ApplicantEducation): string {
    const highlights = entry.highlights.join("; ")
    return `- ${entry.course} an ${entry.institution}${entry.endDate.trim().length > 0 ? ` (${entry.endDate})` : ""}${highlights ? ": " + highlights : ""}`
  }

  private formatPersonalNotes(): string | undefined {
    const lines = this.personalNotes
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) return undefined
    return `## Personal Notes\n${lines.map((line) => `- ${line}`).join("\n")}`
  }
}

export interface ApplicantPersonal {
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

export interface ApplicantSkill {
  name: string
}

export interface ApplicantLanguage {
  language: string
  level: string
}

export interface ApplicantCertification {
  name: string
  issuer: string
  date: string
  discloseDates: boolean
  description: string
}

export interface ApplicantExperience {
  role: string
  company: string
  startDate: string
  endDate: string
  location: string
  discloseDates: boolean
  highlights: string[]
}

export interface ApplicantEducation {
  institution: string
  course: string
  startDate: string
  endDate: string
  location: string
  discloseDates: boolean
  highlights: string[]
}

function hasMeaningfulAddress(address: Address): boolean {
  return !address.isEmpty()
}

function hasMeaningfulExperience(entry: ApplicantExperience): boolean {
  return (
    entry.role.trim().length > 0 ||
    entry.company.trim().length > 0 ||
    entry.startDate.trim().length > 0 ||
    entry.endDate.trim().length > 0 ||
    entry.location.trim().length > 0 ||
    entry.discloseDates ||
    entry.highlights.some((highlight) => highlight.trim().length > 0)
  )
}

function hasMeaningfulEducation(entry: ApplicantEducation): boolean {
  return (
    entry.institution.trim().length > 0 ||
    entry.course.trim().length > 0 ||
    entry.startDate.trim().length > 0 ||
    entry.endDate.trim().length > 0 ||
    entry.location.trim().length > 0 ||
    entry.discloseDates ||
    entry.highlights.some((highlight) => highlight.trim().length > 0)
  )
}

function fillPersonal(
  target: ApplicantPersonal,
  source: z.infer<typeof PersonalInputSchema> | undefined,
): void {
  if (!source) return
  target.name = source.name
  target.email = source.email
  target.phone = source.phone
  target.birthdate = source.birthdate
  target.gender = source.gender
  target.address = Address.parse(source.address)
  target.hobbies = parseHobbies(source.hobbies)
  target.discloseBirthdate = source.discloseBirthdate
  target.discloseGender = source.discloseGender
  target.discloseAddress = source.discloseAddress
  target.discloseHobbies = source.discloseHobbies
}

function fillDisclose(
  target: ApplicantPersonal,
  source: z.infer<typeof DiscloseInputSchema> | undefined,
): void {
  if (!source) return
  if (source.birthdate !== undefined)
    target.discloseBirthdate = source.birthdate
  if (source.gender !== undefined) target.discloseGender = source.gender
  if (source.address !== undefined) target.discloseAddress = source.address
  if (source.hobbies !== undefined) target.discloseHobbies = source.hobbies
}

function parseHobbies(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(", ")
  return value ?? ""
}

function mapExperience(
  entry: z.infer<typeof ExperienceInputSchema>,
): ApplicantExperience {
  return {
    role: entry.role,
    company: entry.company,
    startDate: entry.startDate,
    endDate: entry.endDate,
    location: entry.location,
    discloseDates: entry.discloseDates,
    highlights: entry.highlights,
  }
}

function mapEducation(
  entry: z.infer<typeof EducationInputSchema>,
): ApplicantEducation {
  return {
    institution: entry.institution,
    course: entry.course,
    startDate: entry.startDate,
    endDate: entry.endDate,
    location: entry.location,
    discloseDates: entry.discloseDates,
    highlights: entry.highlights,
  }
}

function mapSkill(skill: z.infer<typeof SkillInputSchema>): ApplicantSkill {
  return { name: skill.name }
}

function mapLanguage(
  lang: z.infer<typeof LanguageInputSchema>,
): ApplicantLanguage {
  return { language: lang.language, level: lang.level }
}

function mapCertification(
  cert: z.infer<typeof CertificationInputSchema>,
): ApplicantCertification {
  return {
    name: cert.name,
    issuer: cert.issuer,
    date: cert.date,
    discloseDates: cert.discloseDates,
    description: cert.description,
  }
}

const PersonalInputSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  birthdate: z.string().default(""),
  gender: z.string().default(""),
  address: Address.schema.default({ street: "", zip: "", city: "" }),
  hobbies: z.union([z.string(), z.array(z.string())]).optional(),
  discloseBirthdate: z.boolean().default(false),
  discloseGender: z.boolean().default(false),
  discloseAddress: z.boolean().default(false),
  discloseHobbies: z.boolean().default(false),
})

const DiscloseInputSchema = z.object({
  birthdate: z.boolean().optional(),
  gender: z.boolean().optional(),
  address: z.boolean().optional(),
  hobbies: z.boolean().optional(),
})

const ExperienceInputSchema = z.object({
  role: z.string().default(""),
  company: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  location: z.string().default(""),
  discloseDates: z.boolean().default(false),
  highlights: z.array(z.string()).default([]),
})

const EducationInputSchema = z.object({
  institution: z.string().default(""),
  course: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  location: z.string().default(""),
  discloseDates: z.boolean().default(false),
  highlights: z.array(z.string()).default([]),
})

const SkillInputSchema = z.object({
  name: z.string().default(""),
})

const LanguageInputSchema = z.object({
  language: z.string().default(""),
  level: z.string().default(""),
})

const CertificationInputSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().default(""),
  discloseDates: z.boolean().default(false),
  description: z.string().default(""),
})

const ApplicantInputSchema = z.object({
  personal: PersonalInputSchema.optional(),
  disclose: DiscloseInputSchema.optional(),
  experience: z.array(ExperienceInputSchema).optional(),
  education: z.array(EducationInputSchema).optional(),
  skills: z.array(SkillInputSchema).optional(),
  languages: z.array(LanguageInputSchema).optional(),
  certifications: z.array(CertificationInputSchema).optional(),
  personalNotes: z.string().default(""),
})
