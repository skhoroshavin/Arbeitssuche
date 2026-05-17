/* eslint-disable unslop/no-single-use-constants */

import { z } from "zod"

export type LlmProviderInfoDTO = z.infer<typeof LlmProviderInfoSchema>

export type CommuteProviderInfoDTO = z.infer<typeof CommuteProviderInfoSchema>

export type LlmModelDTO = z.infer<typeof LlmModelSchema>

export type MaskedSecretDTO = z.infer<typeof MaskedSecretSchema>

export type ResolvedConfigDTO = z.infer<typeof ResolvedConfigSchema>

export type SecretTestResultDTO = z.infer<typeof SecretTestResultSchema>

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

export const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
})

export const MaskedSecretsRecordSchema = z.record(MaskedSecretSchema)

export const MaskedSecretSchema = z.object({
  masked: z.string(),
  isSet: z.boolean(),
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

export const OkSchema = z.object({ ok: z.literal(true) })
