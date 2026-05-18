import { z } from "zod"

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

export const JobSearchDraftSchema = z.object({
  applicantId: z.string(),
  snapshot: JobSearchEditorSnapshotSchema,
  meaningful: z.boolean(),
})

export const JobSearchInfoSchema = z.object({
  id: z.string(),
  applicantId: z.string(),
  searchTerm: z.string(),
})
