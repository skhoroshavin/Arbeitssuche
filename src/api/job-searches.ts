import { z } from "zod"

const SearchParametersSchema = z.object({
  searchTerm: z.string(),
  radiusKm: z.number(),
  searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
  sources: z.array(z.string()),
  maxResults: z.number().optional(),
})

const SearchPreferencesSchema = z.object({
  maxDistanceKm: z.number().optional(),
  maxCommuteMinutes: z.number().optional(),
  freeText: z.array(z.string()),
})

export const JobSearchSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  params: SearchParametersSchema,
  preferences: SearchPreferencesSchema,
})

export const JobSearchEditorSnapshotSchema = z.object({
  params: SearchParametersSchema,
  preferences: SearchPreferencesSchema,
  coverLetterContent: z.string(),
})

const JobSearchDraftSchema = z.object({
  applicantId: z.string(),
  snapshot: JobSearchEditorSnapshotSchema,
  meaningful: z.boolean(),
})

export const JobSearchDraftResponseSchema = z.object({
  draft: JobSearchDraftSchema.optional(),
})

const JobSearchInfoSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  searchTerm: z.string(),
})

export const JobSearchListResponseSchema = z.object({
  jobSearches: z.array(JobSearchInfoSchema),
})

export const CreatedJobSearchIdSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
})

export const ContentSchema = z.object({ content: z.string() })
