import { useInvalidate } from "@/ui/hooks";
import { ipcFetch } from "./internal/ipc-client";
import { useIpcMutation } from "./internal/use-ipc-mutation";
import { useIpcQuery } from "./internal/use-ipc-query";
import type {
  MaskedSecrets,
  SecretKey,
  SecretKeyInfo,
} from "@/models/secrets/types";
import type { ConfigKey, LlmModel, LlmProvider } from "@/models/config/types";
import { DEFAULT_PROVIDER } from "@/models/config/types";
import type { ResolvedConfig } from "@/models/config/resolve";

export function useSecrets() {
  return useIpcQuery({
    queryKey: ["secrets"],
    queryFn: () => ipcFetch<MaskedSecrets>("/settings/secrets"),
  });
}

export function useSaveSecret() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: ({ key, value }: { key: SecretKey; value: string }) =>
      ipcFetch(`/settings/secrets/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => invalidate(["secrets"]),
  });
}

export function useClearSecret() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (key: SecretKey) =>
      ipcFetch(`/settings/secrets/${key}`, { method: "DELETE" }),
    onSuccess: () => invalidate(["secrets"]),
  });
}

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

export function useSecretKeyInfos() {
  return useIpcQuery({
    queryKey: ["secret-key-infos"],
    queryFn: () => ipcFetch<SecretKeyInfo[]>("/settings/secrets/info"),
  });
}

export function useTestSecret() {
  return useIpcMutation({
    mutationFn: (key: SecretKey) =>
      ipcFetch<{ ok: boolean; error?: string }>(
        `/settings/secrets/test/${key}`,
        { method: "POST" },
      ),
  });
}

const PROVIDER_SECRET_KEYS: Record<LlmProvider, SecretKey> = {
  openrouter: "openrouterApiKey",
  requesty: "requestyApiKey",
};

export function useApiKeyStatus(): {
  hasLlmKey: boolean;
  hasMapsKey: boolean;
  isLoading: boolean;
} {
  const { data: secrets, isLoading: secretsLoading } = useSecrets();
  const { data: config, isLoading: configLoading } = useConfig();

  const provider: LlmProvider = config?.provider ?? DEFAULT_PROVIDER;
  const llmKey = PROVIDER_SECRET_KEYS[provider];

  return {
    hasLlmKey: secrets?.[llmKey]?.isSet ?? false,
    hasMapsKey: secrets?.googleMapsApiKey?.isSet ?? false,
    isLoading: secretsLoading || configLoading,
  };
}
