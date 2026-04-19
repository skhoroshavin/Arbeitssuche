import type { AppSetupState } from "@/models/setup"

export interface SetupRepository {
  load(): AppSetupState | undefined
  save(update: Partial<AppSetupState>): Promise<AppSetupState>
  complete(): Promise<AppSetupState>
  reset(): Promise<AppSetupState>
}
