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

// --- Provider secrets (factory) ---

function createProviderSecretHooks(type: "llm" | "commute") {
  const queryKey = [`${type}-secrets`];
  const basePath = `/settings/${type}`;

  function useSecrets() {
    return useIpcQuery({
      queryKey,
      queryFn: () =>
        ipcFetch<Record<string, MaskedSecret>>(`${basePath}/secrets`),
    });
  }

  function useSave() {
    const invalidate = useInvalidate();
    return useIpcMutation({
      mutationFn: ({
        providerId,
        value,
      }: {
        providerId: string;
        value: string;
      }) =>
        ipcFetch(`${basePath}/${providerId}/secret`, {
          method: "PUT",
          body: JSON.stringify({ value }),
        }),
      onSuccess: () => invalidate(queryKey),
    });
  }

  function useClear() {
    const invalidate = useInvalidate();
    return useIpcMutation({
      mutationFn: (providerId: string) =>
        ipcFetch(`${basePath}/${providerId}/secret`, { method: "DELETE" }),
      onSuccess: () => invalidate(queryKey),
    });
  }

  function useTest() {
    return useIpcMutation({
      mutationFn: (providerId: string) =>
        ipcFetch<{ ok: boolean; error?: string }>(
          `${basePath}/${providerId}/secret/test`,
          { method: "POST" },
        ),
    });
  }

  return { useSecrets, useSave, useClear, useTest };
}

const llmHooks = createProviderSecretHooks("llm");
const commuteHooks = createProviderSecretHooks("commute");

export function useLlmSecrets() {
  return llmHooks.useSecrets();
}
export function useSaveLlmSecret() {
  return llmHooks.useSave();
}
export function useClearLlmSecret() {
  return llmHooks.useClear();
}
export function useTestLlmSecret() {
  return llmHooks.useTest();
}

export function useCommuteSecrets() {
  return commuteHooks.useSecrets();
}
export function useSaveCommuteSecret() {
  return commuteHooks.useSave();
}
export function useClearCommuteSecret() {
  return commuteHooks.useClear();
}
export function useTestCommuteSecret() {
  return commuteHooks.useTest();
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
