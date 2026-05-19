export interface KVStore {
  get(key: string): unknown
  set(key: string, value: unknown): void
}

export { createElectronKVStore } from "./electron"
export { createStubKVStore } from "./stub"
