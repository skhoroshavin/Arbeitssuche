import { z } from "zod"

export const AppSetupStateSchema = z.object({
  completed: z.boolean(),
  lastPhase: z.enum(["settings", "applicant", "job-search"]).optional(),
  lastStep: z.string().optional(),
  applicantId: z.string().optional(),
})

export const SetupStateLoadResultSchema = z.object({
  state: AppSetupStateSchema.optional(),
})

export { OkResponseSchema as ClearDataOkSchema } from "./ok-response.js"
