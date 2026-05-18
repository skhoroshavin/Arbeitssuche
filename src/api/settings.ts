import { z } from "zod"

export const LlmProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
})

export const CommuteProviderInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  instructions: z.string(),
})

export const MaskedSecretSchema = z.object({
  masked: z.string(),
  isSet: z.boolean(),
})

export const MaskedSecretsRecordSchema = z.record(MaskedSecretSchema)

export const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
})

export const ResolvedConfigSchema = z.object({
  provider: z.enum(["openrouter", "requesty"]),
  assessmentModel: z.string(),
  coverLetterModel: z.string(),
  consultationModel: z.string(),
})

export const SecretTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
})

export { OkResponseSchema as OkSchema } from "./ok-response.js"
