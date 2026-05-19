import type { KVStore } from "@/plugins/kvstore"

export function createStubKVStore(): KVStore {
  const data = new Map<string, unknown>()

  return {
    get(key: string): unknown {
      return data.get(key)
    },

    set(key: string, value: unknown): void {
      data.set(key, value)
    },
  }
}
