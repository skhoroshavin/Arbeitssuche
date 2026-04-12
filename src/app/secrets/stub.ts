import { resolveSecrets } from "@/models/secrets/index.js"
import type { Secrets } from "@/models/secrets"
import type { SecretsRepository } from "./types.js"

export function createStubSecretsRepository(
  initial?: Secrets,
): SecretsRepository {
  let stored: Secrets = structuredClone(resolveSecrets(initial))

  return {
    load(): Secrets {
      return structuredClone(stored)
    },

    save(data: Secrets): Promise<void> {
      stored = structuredClone(resolveSecrets(data))
      return Promise.resolve()
    },
  }
}
