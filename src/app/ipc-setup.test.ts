import { describe, expect, it, vi } from "vitest"
import { clearAppData, registerSetupHandlers } from "@/app"
import { createConfigRepository } from "@/repositories/config"
import { createStubSetupRepository } from "@/app/setup"
import { createStubKVStore } from "@/plugins/kvstore/stub"
import { createStubCipher } from "@/plugins/cipher/stub"
import { Config } from "@/models/config"
import { Secrets } from "@/models/secrets"

describe("setup IPC handlers", () => {
  it("loads, saves, and completes setup state", async () => {
    const calls = new Map<string, (...arguments_: unknown[]) => unknown>()
    const services = createServices()

    registerSetupHandlers(
      (channel, handler) => {
        calls.set(channel, (...arguments_) => handler(...arguments_))
      },
      services,
      createControls(),
    )

    expect(await invoke(calls, "setup:state:load")).toEqual({
      state: undefined,
    })

    expect(
      await invoke(calls, "setup:state:save", {
        lastPhase: "applicant",
        lastStep: "experience",
      }),
    ).toEqual({
      completed: false,
      lastPhase: "applicant",
      lastStep: "experience",
    })

    expect(await invoke(calls, "setup:state:complete")).toEqual({
      completed: true,
    })
  })

  it("clears persisted data and reopens the database", async () => {
    const services = createServices()
    const controls = createControls()

    const config = new Config()
    config.assessmentModel = "test/model"
    await services.configRepo.saveConfig(config)

    const secrets = new Secrets()
    secrets.openrouterApiKey = "secret"
    await services.configRepo.saveSecrets(secrets)

    await services.setupRepo.save({
      lastPhase: "job-search",
      lastStep: "preferences",
      applicantId: "ada",
    })

    await clearAppData({ services, controls })

    expect(controls.closeDatabase).toHaveBeenCalledOnce()
    expect(controls.deleteDatabaseFiles).toHaveBeenCalledOnce()
    expect(controls.reopenDatabase).toHaveBeenCalledOnce()
    expect(services.configRepo.loadConfig()).toEqual(new Config())
    expect(services.configRepo.loadSecrets()).toEqual(new Secrets())
    expect(services.setupRepo.load()).toEqual({ completed: false })
  })
})

function invoke(
  calls: Map<string, (...arguments_: unknown[]) => unknown>,
  channel: string,
  ...arguments_: unknown[]
) {
  const handler = calls.get(channel)
  if (!handler) {
    throw new Error(`Missing handler for ${channel}`)
  }
  return handler(...arguments_)
}

function createControls() {
  return {
    closeDatabase: vi.fn(),
    deleteDatabaseFiles: vi.fn(),
    reopenDatabase: vi.fn(),
    closeApp: vi.fn(),
  }
}

function createServices() {
  const kvStore = createStubKVStore()
  const cipher = createStubCipher()
  return {
    configRepo: createConfigRepository(kvStore, cipher),
    setupRepo: createStubSetupRepository(),
  }
}
