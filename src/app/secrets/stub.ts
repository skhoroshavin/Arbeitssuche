import { DEFAULT_SECRETS, type Secrets } from "@/models/secrets/types.js";
import type { SecretsRepository } from "./types.js";

export function createStubSecretsRepository(
  initial?: Secrets,
): SecretsRepository {
  let stored: Secrets = structuredClone(initial ?? DEFAULT_SECRETS);

  return {
    load(): Secrets {
      return structuredClone(stored);
    },

    async save(data: Secrets) {
      stored = structuredClone(data);
    },
  };
}
