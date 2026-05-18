import { z } from "zod"

export const DeletedIdSchema = z.object({ deleted: z.string() })
