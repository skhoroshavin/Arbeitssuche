import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Secrets } from "@/models/secrets/types.js";
import { DEFAULT_SECRETS } from "@/models/secrets/types.js";
import type { Cipher, SecretsRepository } from "./types.js";

export function createEncryptedSecretsRepository(
  filePath: string,
  cipher: Cipher,
): SecretsRepository {
  return {
    load(): Secrets {
      if (!existsSync(filePath)) {
        return { ...DEFAULT_SECRETS };
      }

      try {
        const encrypted = readFileSync(filePath);
        const decrypted = cipher.decryptString(encrypted);
        return JSON.parse(decrypted);
      } catch {
        return { ...DEFAULT_SECRETS };
      }
    },

    async save(data: Secrets): Promise<void> {
      mkdirSync(dirname(filePath), { recursive: true });
      const encrypted = cipher.encryptString(JSON.stringify(data));
      writeFileSync(filePath, encrypted);
    },
  };
}
