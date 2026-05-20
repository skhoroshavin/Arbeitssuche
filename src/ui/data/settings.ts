import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { z } from "zod"

import type { MaskedSecret } from "@/models/secrets"

import type { ConfigKey, LlmModel, LlmProviderId } from "@/models/config"

import { Config, DEFAULT_PROVIDER } from "@/models/config"

import { api } from "./internal/api"

// --- Provider secrets (factory) ---

export function useProviderSecretActions(
  type: "llm" | "commute",
  providerId: string,
) {
  const hooks = type === "llm" ? llmHooks : commuteHooks
  const saveMutation = hooks.useSave()
  const clearMutation = hooks.useClear()
  const testMutation = hooks.useTest()

  return {
    onSave: async (value: string) => {
      await saveMutation.mutateAsync({ providerId, value })
    },
    onClear: async () => {
      await clearMutation.mutateAsync(providerId)
    },
    onTest: () => testMutation.mutateAsync(providerId),
  }
}

export function resolveSecret(
  secrets: Record<string, MaskedSecret> | undefined,
  providerId: string,
): MaskedSecret {
  return secrets?.[providerId] ?? EMPTY_MASKED_SECRET
}

// --- Provider info ---

export function useCommuteProviderListView() {
  const query = useCommuteProviders()
  return {
    ...query,
    data: query.data ?? [],
  }
}

// --- API key status (used across the app) ---

export function useApiKeyStatus(): {
  hasLlmKey: boolean
  hasMapsKey: boolean
  isLoading: boolean
} {
  const { data: llmSecrets, isLoading: llmLoading } = useLlmSecrets()
  const { data: commuteSecrets, isLoading: commuteLoading } =
    useCommuteSecrets()
  const { data: config, isLoading: configLoading } = useConfig()

  const provider: LlmProviderId = config?.provider ?? DEFAULT_PROVIDER
  const isLoading = llmLoading || commuteLoading || configLoading

  return {
    hasLlmKey: hasSecret(llmSecrets, provider),
    hasMapsKey: hasSecret(commuteSecrets, "google-maps"),
    isLoading,
  }
}

export function useAISettingsView(fallbackModels: LlmModel[]) {
  const { data: secrets, isLoading: secretsLoading } = useLlmSecrets()
  const { data: config, isLoading: configLoading } = useResolvedConfig()
  const { data: remoteModels, isLoading: modelsLoading } = useLlmModels()
  const { data: providers } = useLlmProviders()
  const saveConfig = useSaveConfig()

  return {
    secrets,
    provider: config.provider,
    config,
    providers: providers ?? [],
    models:
      remoteModels && remoteModels.length > 0 ? remoteModels : fallbackModels,
    modelsLoading,
    saveConfig,
    isLoading: secretsLoading || configLoading,
  }
}

export function useCommuteSecrets() {
  return commuteHooks.useSecrets()
}

export function useLlmProviders() {
  return useQuery({
    queryKey: ["llm-providers"],
    queryFn: async () =>
      z
        .array(LlmProviderSchema)
        .parse(await api().invoke("settings:llm-providers")),
  })
}

const EMPTY_MASKED_SECRET: MaskedSecret = { masked: "", isSet: false }

function useLlmSecrets() {
  return llmHooks.useSecrets()
}

function useCommuteProviders() {
  return useQuery({
    queryKey: ["commute-providers"],
    queryFn: async () =>
      z
        .array(CommuteProviderSchema)
        .parse(await api().invoke("settings:commute-providers")),
  })
}

function useResolvedConfig() {
  const query = useConfig()
  return {
    ...query,
    data: query.data ?? new Config(),
  }
}

function useSaveConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: ConfigKey; value: string }) =>
      api().invoke("settings:config:save", key, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["config"] })
      void queryClient.invalidateQueries({ queryKey: ["llm-models"] })
    },
  })
}

function hasSecret(
  secrets: Record<string, MaskedSecret> | undefined,
  key: string,
): boolean {
  return secrets?.[key]?.isSet ?? false
}

function createProviderSecretHooks(type: "llm" | "commute") {
  const queryKey = [`${type}-secrets`]

  function useSecrets() {
    return useQuery({
      queryKey,
      queryFn: async () =>
        MaskedSecretsRecordSchema.parse(
          await api().invoke(`settings:${type}:secrets`),
        ),
    })
  }

  function useSave() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: ({
        providerId,
        value,
      }: {
        providerId: string
        value: string
      }) => api().invoke(`settings:${type}:secret:save`, providerId, value),
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  function useClear() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: (providerId: string) =>
        api().invoke(`settings:${type}:secret:clear`, providerId),
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    })
  }

  function useTest() {
    return useMutation({
      mutationFn: async (providerId: string) =>
        SecretTestResultSchema.parse(
          await api().invoke(`settings:${type}:secret:test`, providerId),
        ),
    })
  }

  return { useSecrets, useSave, useClear, useTest }
}

// --- Config ---

function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () =>
      Config.parse(await api().invoke("settings:config:load")),
  })
}

function useLlmModels() {
  return useQuery({
    queryKey: ["llm-models"],
    queryFn: async () =>
      z.array(LlmModelSchema).parse(await api().invoke("settings:llm-models")),
  })
}

const LlmProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
})

const CommuteProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  instructions: z.string(),
})

const LlmModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
})

const MaskedSecretSchema = z.object({
  masked: z.string(),
  isSet: z.boolean(),
})

const MaskedSecretsRecordSchema = z.record(z.string(), MaskedSecretSchema)

const SecretTestResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
})

const llmHooks = createProviderSecretHooks("llm")

const commuteHooks = createProviderSecretHooks("commute")
