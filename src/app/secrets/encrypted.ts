import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import typia from "typia"
import type { Secrets } from "@/models/secrets"
import { resolveSecrets } from "@/models/secrets/index.js"
import type { Cipher, SecretsRepository } from "./types.js"

export function createEncryptedSecretsRepository(
  filePath: string,
  cipher: Cipher,
): SecretsRepository {
  return {
    load(): Secrets {
      if (!existsSync(filePath)) {
        return resolveSecrets()
      }

      try {
        const encrypted = readFileSync(filePath)
        const decrypted = cipher.decryptString(encrypted)
        return resolveSecrets(typia.json.assertParse<Secrets>(decrypted))
      } catch {
        return resolveSecrets()
      }
    },

    save(data: Secrets): Promise<void> {
      mkdirSync(path.dirname(filePath), { recursive: true })
      const encrypted = cipher.encryptString(
        JSON.stringify(resolveSecrets(data)),
      )
      writeFileSync(filePath, encrypted)
      return Promise.resolve()
    },
  }
}
