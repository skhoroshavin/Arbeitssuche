import ElectronStoreModule from "electron-store"

import type { KVStore } from "@/plugins/kvstore"

export function createElectronKVStore(): KVStore {
  if (!store) {
    store = instantiateStore()
  }
  return store
}

function instantiateStore(): KVStore {
  const electronStore = new (
    hasCjsDefault(ElectronStoreModule)
      ? ElectronStoreModule.default
      : ElectronStoreModule
  )({ name: "config" })

  return {
    get(key: string): unknown {
      return electronStore.get(key)
    },

    set(key: string, value: unknown): void {
      electronStore.set(key, value)
    },
  }
}

function hasCjsDefault<T>(module_: T): module_ is T & { default: T } {
  return typeof module_ === "object" && module_ !== null && "default" in module_
}

let store: KVStore | undefined
