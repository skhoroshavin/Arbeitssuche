import type { AppConfig } from "@/models/config"
import type { AppSetupState } from "@/models/setup"

import type { ConfigRepository } from "./types.js"
import {
  createAppElectronStore,
  type AppStoreData,
} from "./electron-store-store.js"

export function createElectronStoreConfigRepository(): ConfigRepository {
  const store = createAppElectronStore()

  return {
    load(): AppConfig {
      return cloneConfig(store.store)
    },

    save(data: AppConfig): Promise<void> {
      store.store = mergeStoreData(data, store.store.setup)
      return Promise.resolve()
    },
  }
}

function cloneConfig(storeData: AppStoreData): AppConfig {
  const { setup: _setup, ...config } = storeData
  return structuredClone(config)
}

function mergeStoreData(
  config: AppConfig,
  setup: AppSetupState | undefined,
): AppStoreData {
  if (setup === undefined) {
    return structuredClone(config)
  }

  return {
    ...structuredClone(config),
    setup: structuredClone(setup),
  }
}
