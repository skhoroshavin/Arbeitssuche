import { safeStorage } from "electron"

import type { Cipher } from "@/plugins/cipher"

export function createElectronCipher(): Cipher {
  return {
    encryptString(plainText: string): Buffer {
      return safeStorage.encryptString(plainText)
    },

    decryptString(encrypted: Buffer): string {
      return safeStorage.decryptString(encrypted)
    },

    isAvailable(): boolean {
      return safeStorage.isEncryptionAvailable()
    },
  }
}
