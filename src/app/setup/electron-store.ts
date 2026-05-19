import { createElectronKVStore } from "@/plugins/kvstore"
import {
  completeSetupState,
  createIncompleteSetupState,
  mergeSetupState,
  resolveSetupState,
} from "@/models/setup"
import type { AppSetupState } from "@/models/setup"
import type { SetupRepository } from "./types.js"

export function createElectronStoreSetupRepository(): SetupRepository {
  const kvStore = createElectronKVStore()

  return {
    load(): AppSetupState | undefined {
      const setup = kvStore.get("setup")
      return isSetupState(setup)
        ? structuredClone(resolveSetupState(setup))
        : undefined
    },

    save(update: Partial<AppSetupState>): Promise<AppSetupState> {
      const current = kvStore.get("setup")
      const next = mergeSetupState(
        isSetupState(current) ? current : undefined,
        update,
      )
      kvStore.set("setup", next)
      return Promise.resolve(structuredClone(next))
    },

    complete(): Promise<AppSetupState> {
      const next = completeSetupState()
      kvStore.set("setup", next)
      return Promise.resolve(structuredClone(next))
    },

    reset(): Promise<AppSetupState> {
      const next = createIncompleteSetupState()
      kvStore.set("setup", next)
      return Promise.resolve(structuredClone(next))
    },
  }
}

function isSetupState(value: unknown): value is Partial<AppSetupState> {
  return value === undefined || (typeof value === "object" && value !== null)
}
