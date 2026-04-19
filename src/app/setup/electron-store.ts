import { createAppElectronStore } from "@/app/config"
import {
  completeSetupState,
  createIncompleteSetupState,
  mergeSetupState,
  resolveSetupState,
} from "@/models/setup"
import type { AppSetupState } from "@/models/setup"
import type { SetupRepository } from "./types.js"

export function createElectronStoreSetupRepository(): SetupRepository {
  const store = createAppElectronStore()

  return {
    load(): AppSetupState | undefined {
      const setup = store.store.setup
      return setup ? structuredClone(resolveSetupState(setup)) : undefined
    },

    save(update: Partial<AppSetupState>): Promise<AppSetupState> {
      const next = mergeSetupState(store.store.setup, update)
      store.store = mergeStoreData(store.store, next)
      return Promise.resolve(structuredClone(next))
    },

    complete(): Promise<AppSetupState> {
      const next = completeSetupState()
      store.store = mergeStoreData(store.store, next)
      return Promise.resolve(structuredClone(next))
    },

    reset(): Promise<AppSetupState> {
      const next = createIncompleteSetupState()
      store.store = mergeStoreData(store.store, next)
      return Promise.resolve(structuredClone(next))
    },
  }
}

function mergeStoreData(
  storeData: ReturnType<typeof createAppElectronStore>["store"],
  setup: AppSetupState,
): ReturnType<typeof createAppElectronStore>["store"] {
  const { setup: _setup, ...config } = storeData
  return {
    ...structuredClone(config),
    setup: structuredClone(setup),
  }
}
