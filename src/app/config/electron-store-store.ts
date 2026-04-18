import ElectronStoreModule from "electron-store"

import type { AppConfig } from "@/models/config"

import type { AppSetupState } from "@/models/setup"

export type AppStoreData = AppConfig & { setup?: AppSetupState }

export function createAppElectronStore() {
  if (!appStore) {
    appStore = instantiateStore()
  }
  return appStore
}

function instantiateStore() {
  return new (
    hasCjsDefault(ElectronStoreModule)
      ? ElectronStoreModule.default
      : ElectronStoreModule
  )<AppStoreData>({ name: "config" })
}

function hasCjsDefault<T>(module_: T): module_ is T & { default: T } {
  return typeof module_ === "object" && module_ !== null && "default" in module_
}

let appStore: ReturnType<typeof instantiateStore> | undefined
