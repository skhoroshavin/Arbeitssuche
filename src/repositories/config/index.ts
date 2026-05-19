import type { Config } from "@/models/config"
import type { Secrets } from "@/models/secrets"
import type { Cipher } from "@/plugins/cipher"
import type { KVStore } from "@/plugins/kvstore"
import { ConfigRepositoryImpl } from "./impl"

export const createConfigRepository = (
  kvStore: KVStore,
  cipher: Cipher,
  legacySecretsFile?: string,
): ConfigRepository =>
  new ConfigRepositoryImpl(kvStore, cipher, legacySecretsFile)

export interface ConfigRepository {
  loadConfig(): Config
  saveConfig(data: Config): Promise<void>
  loadSecrets(): Secrets
  saveSecrets(data: Secrets): Promise<void>
}
