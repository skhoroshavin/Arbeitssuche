/* eslint-disable unslop/no-single-use-constants */

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

export const ApplicantSchema = z.object({
  id: z.string(),
  personal: ApplicantPersonalSchema,
  disclose: z.object({
    birthdate: z.boolean(),
    gender: z.boolean(),
    address: z.boolean(),
    hobbies: z.boolean(),
  }),
  experience: z.array(ApplicantExperienceSchema),
  education: z.array(
    z.object({
      institution: z.string(),
      course: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      location: z.string().optional(),
      discloseDates: z.boolean().optional(),
      highlights: z.array(z.string()).optional(),
    }),
  ),
  skills: z.array(
    z.object({
      name: z.string(),
    }),
  ),
  languages: z.array(
    z.object({
      language: z.string(),
      level: z.string(),
    }),
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().optional(),
      date: z.string().optional(),
      discloseDates: z.boolean().optional(),
      description: z.string().optional(),
    }),
  ),
  personalNotes: z.array(z.string()).optional(),
})
export type ApplicantDTO = z.infer<typeof ApplicantSchema>

export const ApplicantInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
})
export type ApplicantInfoDTO = z.infer<typeof ApplicantInfoSchema>

export const ApplicantDraftResponseSchema = z.object({
  draft: z
    .object({
      snapshot: ApplicantSchema,
      meaningful: z.boolean(),
    })
    .optional(),
})

export const ApplicantListResponseSchema = z.object({
  applicants: z.array(ApplicantInfoSchema),
})

export const CreatedIdSchema = z.object({ id: z.string() })

export const DeletedIdSchema = z.object({ deleted: z.string() })

export { OkResponseSchema as SavedOkSchema } from "./ok-response.js"

export const SuggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      searchTerm: z.string(),
      searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
      reason: z.string(),
    }),
  ),
})
