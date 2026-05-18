import { z } from "zod"

export const MaskedSecretSchema = z.object({
  masked: z.string(),
  isSet: z.boolean(),
})

export const MaskedSecretsRecordSchema = z.record(MaskedSecretSchema)

export const SecretTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
})
