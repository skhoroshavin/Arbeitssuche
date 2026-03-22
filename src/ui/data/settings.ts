import { useInvalidate } from "@/ui/hooks";
import { ipcFetch } from "./internal/ipc-client";
import { useIpcMutation } from "./internal/use-ipc-mutation";
import { useIpcQuery } from "./internal/use-ipc-query";
import type { MaskedSecret } from "@/models/secrets/types";
import type {
  ConfigKey,
  LlmModel,
  LlmProvider,
  LlmProviderInfo,
  CommuteProviderInfo,
} from "@/models/config/types";
import { DEFAULT_PROVIDER } from "@/models/config/types";
import type { ResolvedConfig } from "@/models/config/resolve";

// --- LLM secrets ---

export function useLlmSecrets() {
  return useIpcQuery({
    queryKey: ["llm-secrets"],
    queryFn: () =>
      ipcFetch<Record<string, MaskedSecret>>("/settings/llm/secrets"),
  });
}

export function useSaveLlmSecret() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: ({
      providerId,
      value,
    }: {
      providerId: string;
      value: string;
    }) =>
      ipcFetch(`/settings/llm/${providerId}/secret`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => invalidate(["llm-secrets"]),
  });
}

export function useClearLlmSecret() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (providerId: string) =>
      ipcFetch(`/settings/llm/${providerId}/secret`, { method: "DELETE" }),
    onSuccess: () => invalidate(["llm-secrets"]),
  });
}

export function useTestLlmSecret() {
  return useIpcMutation({
    mutationFn: (providerId: string) =>
      ipcFetch<{ ok: boolean; error?: string }>(
        `/settings/llm/${providerId}/secret/test`,
        { method: "POST" },
      ),
  });
}

// --- Commute secrets ---

export function useCommuteSecrets() {
  return useIpcQuery({
    queryKey: ["commute-secrets"],
    queryFn: () =>
      ipcFetch<Record<string, MaskedSecret>>("/settings/commute/secrets"),
  });
}

export function useSaveCommuteSecret() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: ({
      providerId,
      value,
    }: {
      providerId: string;
      value: string;
    }) =>
      ipcFetch(`/settings/commute/${providerId}/secret`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => invalidate(["commute-secrets"]),
  });
}

export function useClearCommuteSecret() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (providerId: string) =>
      ipcFetch(`/settings/commute/${providerId}/secret`, { method: "DELETE" }),
    onSuccess: () => invalidate(["commute-secrets"]),
  });
}

export function useTestCommuteSecret() {
  return useIpcMutation({
    mutationFn: (providerId: string) =>
      ipcFetch<{ ok: boolean; error?: string }>(
        `/settings/commute/${providerId}/secret/test`,
        { method: "POST" },
      ),
  });
}

// --- Provider info ---

export function useLlmProviders() {
  return useIpcQuery({
    queryKey: ["llm-providers"],
    queryFn: () => ipcFetch<LlmProviderInfo[]>("/settings/llm-providers"),
  });
}

export function useCommuteProviders() {
  return useIpcQuery({
    queryKey: ["commute-providers"],
    queryFn: () =>
      ipcFetch<CommuteProviderInfo[]>("/settings/commute-providers"),
  });
}

// --- Config ---

export function useConfig() {
  return useIpcQuery({
    queryKey: ["config"],
    queryFn: () => ipcFetch<ResolvedConfig>("/settings/config"),
  });
}

export function useLlmModels() {
  return useIpcQuery({
    queryKey: ["llm-models"],
    queryFn: () => ipcFetch<LlmModel[]>("/settings/llm-models"),
  });
}

export function useSaveConfig() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: ({ key, value }: { key: ConfigKey; value: string }) =>
      ipcFetch(`/settings/config/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => {
      invalidate(["config"]);
      invalidate(["llm-models"]);
    },
  });
}

// --- API key status (used across the app) ---

export function useApiKeyStatus(): {
  hasLlmKey: boolean;
  hasMapsKey: boolean;
  isLoading: boolean;
} {
  const { data: llmSecrets, isLoading: llmLoading } = useLlmSecrets();
  const { data: commuteSecrets, isLoading: commuteLoading } =
    useCommuteSecrets();
  const { data: config, isLoading: configLoading } = useConfig();

  const provider: LlmProvider = config?.provider ?? DEFAULT_PROVIDER;

  return {
    hasLlmKey: llmSecrets?.[provider]?.isSet ?? false,
    hasMapsKey: commuteSecrets?.["google-maps"]?.isSet ?? false,
    isLoading: llmLoading || commuteLoading || configLoading,
  };
}
