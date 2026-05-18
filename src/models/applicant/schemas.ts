import { z } from "zod"

export const ApplicantPersonalSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      zip: z.string(),
      city: z.string(),
    })
    .optional(),
  hobbies: z.array(z.string()),
})

export const ApplicantExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string().optional(),
  discloseDates: z.boolean().optional(),
  highlights: z.array(z.string()).optional(),
})

export const ApplicantEducationSchema = z.object({
  institution: z.string(),
  course: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  discloseDates: z.boolean().optional(),
  highlights: z.array(z.string()).optional(),
})

export const ApplicantSkillSchema = z.object({
  name: z.string(),
})

export const ApplicantLanguageSchema = z.object({
  language: z.string(),
  level: z.string(),
})

export const ApplicantCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  discloseDates: z.boolean().optional(),
  description: z.string().optional(),
})

export const ApplicantDiscloseSchema = z.object({
  birthdate: z.boolean(),
  gender: z.boolean(),
  address: z.boolean(),
  hobbies: z.boolean(),
})

export const ApplicantSchema = z.object({
  id: z.string(),
  personal: ApplicantPersonalSchema,
  disclose: ApplicantDiscloseSchema,
  experience: z.array(ApplicantExperienceSchema),
  education: z.array(ApplicantEducationSchema),
  skills: z.array(ApplicantSkillSchema),
  languages: z.array(ApplicantLanguageSchema),
  certifications: z.array(ApplicantCertificationSchema),
  personalNotes: z.array(z.string()).optional(),
})

export const ApplicantInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
})
