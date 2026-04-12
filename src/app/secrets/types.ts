import type { Secrets } from "@/models/secrets"

export interface Cipher {
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
}

export interface SecretsRepository {
  load(): Secrets
  save(data: Secrets): Promise<void>
}
