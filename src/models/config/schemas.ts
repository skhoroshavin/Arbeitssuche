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
