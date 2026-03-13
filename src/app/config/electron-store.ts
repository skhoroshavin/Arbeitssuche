import ElectronStoreModule from "electron-store";
import type { AppConfig } from "@/models/config/types.js";
import type { ConfigRepository } from "./types.js";

// Handle CJS/ESM interop: bundled CJS wraps default export as { default: ... }
const ElectronStore =
  "default" in ElectronStoreModule
    ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- CJS/ESM interop
      (ElectronStoreModule.default as typeof ElectronStoreModule)
    : ElectronStoreModule;

export function createElectronStoreConfigRepository(): ConfigRepository {
  const store = new ElectronStore<AppConfig>({ name: "config" });

  return {
    load(): AppConfig {
      return structuredClone(store.store);
    },

    async save(data: AppConfig) {
      store.store = data;
    },
  };
}
