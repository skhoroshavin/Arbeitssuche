import { z } from "zod"

const VacancyContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
})

const VacancySourceSchema = z.object({
  site: z.string(),
  url: z.string(),
})

const CommuteInfoSchema = z.object({
  distance: z.string(),
  durations: z.object({
    morning: z.number(),
    day: z.number(),
    evening: z.number(),
  }),
  fetchedAt: z.string(),
})

const ActivitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("found"),
    date: z.string(),
    notes: z.string().optional(),
    site: z.string(),
    url: z.string(),
    description: z.string().optional(),
    contact: VacancyContactSchema.optional(),
  }),
  z.object({
    type: z.literal("not-found"),
    date: z.string(),
    notes: z.string().optional(),
    site: z.string(),
  }),
  z.object({
    type: z.literal("applied"),
    date: z.string(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("invited"),
    date: z.string(),
    notes: z.string().optional(),
    interviewDate: z.string(),
  }),
  z.object({
    type: z.literal("interviewed"),
    date: z.string(),
    notes: z.string().optional(),
    outcome: z.enum(["completed", "cancelled"]),
  }),
  z.object({
    type: z.literal("offered"),
    date: z.string(),
    notes: z.string().optional(),
    startDate: z.string().optional(),
    salary: z.string().optional(),
  }),
  z.object({
    type: z.literal("rejected"),
    date: z.string(),
    notes: z.string().optional(),
  }),
  z.object({
    type: z.literal("not-interested"),
    date: z.string(),
    notes: z.string().optional(),
  }),
])

const VacancyDTOSchema = z.object({
  hash: z.string(),
  title: z.string(),
  company: z.string(),
  urls: z.array(z.string()),
  addresses: z.array(z.string()),
  contact: VacancyContactSchema,
  startDate: z.string(),
  description: z.string(),
  enriched: z.boolean(),
  enrichmentDirty: z.boolean(),
  summary: z.string(),
  matchScore: z.enum(["very-bad", "bad", "ok", "good", "excellent"]),
  commute: z.record(z.string(), CommuteInfoSchema),
  activityHistory: z.array(ActivitySchema),
  active: z.boolean(),
})

export const VacancyWithStatusSchema = VacancyDTOSchema.extend({
  status: z.enum([
    "new",
    "gone",
    "renewed",
    "applied",
    "ignored",
    "invited",
    "interviewed",
    "offered",
    "rejected",
    "not-interested",
  ]),
  sources: z.array(VacancySourceSchema),
})

export const VacancyListResponseSchema = z.object({
  vacancies: z.array(VacancyWithStatusSchema),
  totalCount: z.number(),
  generatedAt: z.string(),
  latestCrawl: z.string(),
})
