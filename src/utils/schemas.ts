import { z } from "zod"

export const OkSchema = z.object({ ok: z.literal(true) })

export const CreatedIdSchema = z.object({ id: z.string() })

export const DeletedIdSchema = z.object({ deleted: z.string() })
