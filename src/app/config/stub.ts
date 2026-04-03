import { DEFAULT_CONFIG } from "@/models/config/index.js"
import type { AppConfig } from "@/models/config/types.js"
import type { ConfigRepository } from "./types.js"

export function createStubConfigRepository(
  initial?: AppConfig,
): ConfigRepository {
  let stored: AppConfig = structuredClone(initial ?? DEFAULT_CONFIG)

  return {
    load(): AppConfig {
      return structuredClone(stored)
    },

    save(data: AppConfig): Promise<void> {
      stored = structuredClone(data)
      return Promise.resolve()
    },
  }
}
