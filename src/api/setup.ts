import { z } from "zod"

export const AppSetupStateSchema = z.object({
  completed: z.boolean(),
  lastPhase: z.enum(["settings", "applicant", "job-search"]).optional(),
  lastStep: z.string().optional(),
  applicantId: z.string().optional(),
})
export type AppSetupStateDTO = z.infer<typeof AppSetupStateSchema>

export const SetupStateLoadResultSchema = z.object({
  state: AppSetupStateSchema.optional(),
})
export type SetupStateLoadResultDTO = z.infer<typeof SetupStateLoadResultSchema>

export const ClearDataOkSchema = z.object({ ok: z.literal(true) })
