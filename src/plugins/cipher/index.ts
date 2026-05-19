export interface Cipher {
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
  isAvailable(): boolean
}

export { createElectronCipher } from "./electron"
export { createStubCipher } from "./stub"
