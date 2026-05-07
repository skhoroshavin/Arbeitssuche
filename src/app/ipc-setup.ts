import type { AppSetupState } from "@/models/setup"
import type { ConfigRepository } from "@/app/config"
import type { SecretsRepository } from "@/app/secrets"
import type { SetupRepository } from "@/app/setup"
import type { IpcHandle } from "./ipc-handlers.js"
import { toError } from "@/app/to-error.js"

export function registerSetupHandlers(
  handle: IpcHandle,
  services: SetupHandlerServices,
  controls: SetupHandlerControls,
): void {
  handle("setup:state:load", () => ({ state: services.setupRepo.load() }))
  handle("setup:state:save", (update: Partial<AppSetupState>) =>
    services.setupRepo.save(update),
  )
  handle("setup:state:complete", () => services.setupRepo.complete())
  handle("setup:clear-data", async () => clearAppData({ services, controls }))
  handle("app:close", () => {
    controls.closeApp()
    return { ok: true }
  })
}

export async function clearAppData({
  services,
  controls,
}: {
  services: SetupHandlerServices
  controls: SetupHandlerControls
}): Promise<{ ok: true }> {
  let failure: unknown

  controls.closeDatabase()

  try {
    controls.deleteDatabaseFiles()
    await services.configRepo.save({})
    await services.secretsRepo.save({})
    controls.deleteSecretsFile()
    await services.setupRepo.reset()
  } catch (error) {
    failure = error
  } finally {
    controls.reopenDatabase()
  }

  if (failure) {
    throw toError(failure)
  }

  return { ok: true }
}

interface SetupHandlerControls {
  closeDatabase: () => void
  deleteDatabaseFiles: () => void
  deleteSecretsFile: () => void
  reopenDatabase: () => void
  closeApp: () => void
}

interface SetupHandlerServices {
  configRepo: ConfigRepository
  secretsRepo: SecretsRepository
  setupRepo: SetupRepository
}
