import { z } from "zod"

export const OkResponseSchema = z.object({ ok: z.literal(true) })
