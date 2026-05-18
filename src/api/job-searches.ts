/* eslint-disable unslop/no-single-use-constants */

import { z } from "zod"

export type SearchParametersDTO = z.infer<typeof SearchParametersSchema>

export type SearchPreferencesDTO = z.infer<typeof SearchPreferencesSchema>

export type JobSearchDTO = z.infer<typeof JobSearchSchema>

export type JobSearchInfoDTO = z.infer<typeof JobSearchInfoSchema>

export const JobSearchSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  params: SearchParametersSchema,
  preferences: SearchPreferencesSchema,
})

export const JobSearchDraftResponseSchema = z.object({
  draft: JobSearchDraftSchema.optional(),
})

export const JobSearchDraftSchema = z.object({
  applicantId: z.string(),
  snapshot: JobSearchEditorSnapshotSchema,
  meaningful: z.boolean(),
})

export const JobSearchEditorSnapshotSchema = z.object({
  params: SearchParametersSchema,
  preferences: SearchPreferencesSchema,
  coverLetterContent: z.string(),
})

export const SearchParametersSchema = z.object({
  searchTerm: z.string(),
  radiusKm: z.number(),
  searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
  sources: z.array(z.string()),
  maxResults: z.number().optional(),
})

export const SearchPreferencesSchema = z.object({
  maxDistanceKm: z.number().optional(),
  maxCommuteMinutes: z.number().optional(),
  freeText: z.array(z.string()),
})

export const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(JobSearchInfoSchema),
})

export const JobSearchInfoSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  searchTerm: z.string(),
})

export const CreatedJobSearchIdSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
})

export const ContentSchema = z.object({ content: z.string() })

export const DeletedTrueSchema = z.object({ deleted: z.literal(true) })
