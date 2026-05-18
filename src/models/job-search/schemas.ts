import { z } from "zod"

export const JobSearchSchema = z.object({
  searchTerm: z.string(),
  radiusKm: z.number(),
  mode: z.enum(["employment", "entry-level", "apprenticeship"]),
  sources: z.array(z.object({ value: z.string() })),
  maxResultsPerSource: z.number(),
  maxCommuteMinutes: z.number(),
  notes: z.string(),
  coverLetter: z.string(),
})

export const JobSearchInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
})
