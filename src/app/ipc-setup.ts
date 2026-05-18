import {
  AppSetupStateSchema,
  SetupStateLoadResultSchema,
  ClearDataOkSchema,
} from "@/api"
import type { AppSetupState } from "@/models/setup"
import type { ConfigRepository } from "@/app/config"
import type { SecretsRepository } from "@/app/secrets"
import type { SetupRepository } from "@/app/setup"
import type { IpcHandle } from "./ipc-handlers.js"

export function registerSetupHandlers(
  handle: IpcHandle,
  services: SetupHandlerServices,
  controls: SetupHandlerControls,
): void {
  handle("setup:state:load", () =>
    SetupStateLoadResultSchema.parse({ state: services.setupRepo.load() }),
  )
  handle("setup:state:save", async (update: Partial<AppSetupState>) =>
    AppSetupStateSchema.parse(await services.setupRepo.save(update)),
  )
  handle("setup:state:complete", async () =>
    AppSetupStateSchema.parse(await services.setupRepo.complete()),
  )
  handle("setup:clear-data", async () => clearAppData({ services, controls }))
  handle("app:close", () => {
    controls.closeApp()
    return ClearDataOkSchema.parse({ ok: true })
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

  return ClearDataOkSchema.parse({ ok: true })
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

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
