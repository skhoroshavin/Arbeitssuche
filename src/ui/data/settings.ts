import {
  useIpcQuery,
  useIpcMutation,
  useInvalidate,
  ipcFetch,
} from "@/ui/hooks";
import type { MaskedSecrets, SecretKey } from "@/models/secrets/types";
import type { ConfigKey, OpenRouterModel } from "@/models/config/types";

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
    queryFn: () =>
      ipcFetch<{ assessmentModel: string; coverLetterModel: string }>(
        "/settings/config",
      ),
  });
}

export function useOpenRouterModels() {
  return useIpcQuery({
    queryKey: ["openrouter-models"],
    queryFn: () => ipcFetch<OpenRouterModel[]>("/settings/openrouter-models"),
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
    onSuccess: () => invalidate(["config"]),
  });
}
