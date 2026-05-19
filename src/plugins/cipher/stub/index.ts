import type { Cipher } from "@/plugins/cipher"

export function createStubCipher(): Cipher {
  return {
    encryptString(plainText: string): Buffer {
      const buf = Buffer.from(plainText, "utf8")
      for (let index = 0; index < buf.length; index++) {
        buf[index] ^= 0x42
      }
      return buf
    },

    decryptString(encrypted: Buffer): string {
      const buf = Buffer.from(encrypted)
      for (let index = 0; index < buf.length; index++) {
        buf[index] ^= 0x42
      }
      return buf.toString("utf8")
    },

    isAvailable(): boolean {
      return true
    },
  }
}
