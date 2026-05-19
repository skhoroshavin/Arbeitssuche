import { existsSync, readFileSync } from "node:fs"

import { Config } from "@/models/config"
import { Secrets } from "@/models/secrets"
import type { Cipher } from "@/plugins/cipher"
import type { KVStore } from "@/plugins/kvstore"

export interface ConfigRepository {
  loadConfig(): Config
  saveConfig(data: Config): Promise<void>
  loadSecrets(): Secrets
  saveSecrets(data: Secrets): Promise<void>
}

export function createConfigRepository(
  kvStore: KVStore,
  cipher: Cipher,
  migration?: { secretsFilePath?: string },
): ConfigRepository {
  return {
    loadConfig(): Config {
      const raw = kvStore.get("config")
      if (raw !== undefined) {
        return Config.parse(raw)
      }

      const provider = kvStore.get("provider")
      if (provider !== undefined) {
        const migrated = Config.parse({
          provider,
          assessmentModel: kvStore.get("assessmentModel"),
          coverLetterModel: kvStore.get("coverLetterModel"),
          consultationModel: kvStore.get("consultationModel"),
        })
        kvStore.set("config", migrated)
        return migrated
      }

      return Config.parse({})
    },

    saveConfig(data: Config): Promise<void> {
      kvStore.set("config", data)
      return Promise.resolve()
    },

    loadSecrets(): Secrets {
      const encrypted = kvStore.get("secrets")
      if (encrypted !== undefined) {
        return loadSecretsFromEncrypted(encrypted, cipher)
      }

      if (migration?.secretsFilePath && existsSync(migration.secretsFilePath)) {
        try {
          const oldEncrypted = readFileSync(migration.secretsFilePath)
          const decrypted = cipher.decryptString(oldEncrypted)
          const secrets = Secrets.parse(JSON.parse(decrypted))
          kvStore.set(
            "secrets",
            cipher.encryptString(JSON.stringify(secrets)).toString("base64"),
          )
          return secrets
        } catch {
          // fall through to defaults
        }
      }

      return Secrets.parse({})
    },

    saveSecrets(data: Secrets): Promise<void> {
      const encrypted = cipher.encryptString(JSON.stringify(data))
      kvStore.set("secrets", encrypted.toString("base64"))
      return Promise.resolve()
    },
  }
}

function loadSecretsFromEncrypted(
  encrypted: unknown,
  cipher: Cipher,
): Secrets {
  if (typeof encrypted !== "string") return Secrets.parse({})
  try {
    const decrypted = cipher.decryptString(Buffer.from(encrypted, "base64"))
    return Secrets.parse(JSON.parse(decrypted))
  } catch {
    return Secrets.parse({})
  }
}
