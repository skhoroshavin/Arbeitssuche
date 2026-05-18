import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  SetupStateLoadResultSchema,
  AppSetupStateSchema,
  ClearDataOkSchema,
} from "@/api"
import type { AppSetupState } from "@/models/setup"
import { api } from "./internal/api"

export function useSetupState() {
  return useQuery({
    queryKey: ["setup-state"],
    queryFn: async () => {
      return SetupStateLoadResultSchema.parse(
        await api().invoke("setup:state:load"),
      )
    },
  })
}

export function useSaveSetupState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (update: Partial<AppSetupState>) =>
      AppSetupStateSchema.parse(await api().invoke("setup:state:save", update)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["setup-state"] }),
  })
}

export function useCompleteSetupState() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      AppSetupStateSchema.parse(await api().invoke("setup:state:complete")),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["setup-state"] }),
  })
}

export function useClearAllData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      ClearDataOkSchema.parse(await api().invoke("setup:clear-data")),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function closeApp(): Promise<{ ok: true }> {
  return api()
    .invoke("app:close")
    .then((result) => ClearDataOkSchema.parse(result))
}
