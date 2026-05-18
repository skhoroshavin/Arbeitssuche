import { z } from "zod"

export const ProgressPayloadSchema = z.object({
  message: z.string(),
  phase: z.enum(["search", "scan", "enrich", "complete", "done"]).optional(),
  source: z.enum(["crawl", "enrich"]).optional(),
  owner: z.enum(["crawl", "batch"]).optional(),
  vacanciesUpdated: z.boolean().optional(),
  enrichProgress: z
    .object({ completed: z.number(), total: z.number() })
    .optional(),
  jobSearchId: z.string().optional(),
})
