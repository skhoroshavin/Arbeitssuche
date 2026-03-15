import {
  useIpcQuery,
  useIpcMutation,
  useInvalidate,
  ipcFetch,
} from "@/ui/hooks";
import type { MaskedSecrets, SecretKey } from "@/models/secrets/types";
import type { ConfigKey, LlmModel } from "@/models/config/types";
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

/** @deprecated Use useLlmModels instead */
export const useOpenRouterModels = useLlmModels;

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
