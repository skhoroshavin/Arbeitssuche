/* eslint-disable unslop/no-single-use-constants */

import { z } from "zod"

export type AppSetupStateDTO = z.infer<typeof AppSetupStateSchema>

export type SetupStateLoadResultDTO = z.infer<typeof SetupStateLoadResultSchema>

export const SetupStateLoadResultSchema = z.object({
  state: AppSetupStateSchema.optional(),
})

export const AppSetupStateSchema = z.object({
  completed: z.boolean(),
  lastPhase: z.enum(["settings", "applicant", "job-search"]).optional(),
  lastStep: z.string().optional(),
  applicantId: z.string().optional(),
})

export const ClearDataOkSchema = z.object({ ok: z.literal(true) })
