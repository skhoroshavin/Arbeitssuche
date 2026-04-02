import ElectronStoreModule from "electron-store";
import type { AppConfig } from "@/models/config/types.js";
import type { ConfigRepository } from "./types.js";

// Handle CJS/ESM interop: bundled CJS wraps default export as { default: ... }
function hasCjsDefault<T>(module_: T): module_ is T & { default: T } {
  return (
    typeof module_ === "object" && module_ !== null && "default" in module_
  );
}

export function createElectronStoreConfigRepository(): ConfigRepository {
  const store = new ElectronStore<AppConfig>({ name: "config" });

  return {
    load(): AppConfig {
      return structuredClone(store.store);
    },

    save(data: AppConfig): Promise<void> {
      store.store = data;
      return Promise.resolve();
    },
  };
}

const ElectronStore = hasCjsDefault(ElectronStoreModule)
  ? ElectronStoreModule.default
  : ElectronStoreModule;
