import { existsSync, readFileSync } from "node:fs"
import { Config } from "@/models/config"
import { Secrets } from "@/models/secrets"
import type { Cipher } from "@/plugins/cipher"
import type { KVStore } from "@/plugins/kvstore"
import type { ConfigRepository } from "@/repositories/config"

export class ConfigRepositoryImpl implements ConfigRepository {
  constructor(
    private readonly kvStore: KVStore,
    private readonly cipher: Cipher,
    private readonly migration?: { secretsFilePath?: string },
  ) {}

  loadConfig(): Config {
    const raw = this.kvStore.get("config")
    if (raw !== undefined) {
      return Config.parse(raw)
    }

    const provider = this.kvStore.get("provider")
    if (provider !== undefined) {
      const migrated = Config.parse({
        provider,
        assessmentModel: this.kvStore.get("assessmentModel"),
        coverLetterModel: this.kvStore.get("coverLetterModel"),
        consultationModel: this.kvStore.get("consultationModel"),
      })
      this.kvStore.set("config", migrated)
      return migrated
    }

    return Config.parse({})
  }

  saveConfig(data: Config): Promise<void> {
    this.kvStore.set("config", data)
    return Promise.resolve()
  }

  loadSecrets(): Secrets {
    const encrypted = this.kvStore.get("secrets")
    if (encrypted !== undefined) {
      return this.loadSecretsFromEncrypted(encrypted)
    }

    if (
      this.migration?.secretsFilePath &&
      existsSync(this.migration.secretsFilePath)
    ) {
      try {
        const oldEncrypted = readFileSync(this.migration.secretsFilePath)
        const decrypted = this.cipher.decryptString(oldEncrypted)
        const secrets = Secrets.parse(JSON.parse(decrypted))
        const json = JSON.stringify(secrets)
        this.kvStore.set(
          "secrets",
          this.cipher.encryptString(json).toString("base64"),
        )
        return secrets
      } catch {
        // fall through to defaults
      }
    }

    return Secrets.parse({})
  }

  saveSecrets(data: Secrets): Promise<void> {
    const encrypted = this.cipher.encryptString(JSON.stringify(data))
    this.kvStore.set("secrets", encrypted.toString("base64"))
    return Promise.resolve()
  }

  private loadSecretsFromEncrypted(encrypted: unknown): Secrets {
    if (typeof encrypted !== "string") return Secrets.parse({})

    try {
      const decrypted = this.cipher.decryptString(
        Buffer.from(encrypted, "base64"),
      )
      return Secrets.parse(JSON.parse(decrypted))
    } catch {
      return Secrets.parse({})
    }
  }
}
