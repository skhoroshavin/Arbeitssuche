import {
  completeSetupState,
  createIncompleteSetupState,
  mergeSetupState,
  resolveSetupState,
} from "@/models/setup"
import type { AppSetupState } from "@/models/setup"
import type { SetupRepository } from "./types.js"

export function createStubSetupRepository(
  initial?: AppSetupState,
): SetupRepository {
  let stored = initial ? resolveSetupState(initial) : undefined

  return {
    load(): AppSetupState | undefined {
      return stored ? structuredClone(stored) : undefined
    },

    save(update: Partial<AppSetupState>): Promise<AppSetupState> {
      stored = mergeSetupState(stored, update)
      return Promise.resolve(structuredClone(stored))
    },

    complete(): Promise<AppSetupState> {
      stored = completeSetupState()
      return Promise.resolve(structuredClone(stored))
    },

    reset(): Promise<AppSetupState> {
      stored = createIncompleteSetupState()
      return Promise.resolve(structuredClone(stored))
    },
  }
}
