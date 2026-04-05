import type { AppServices } from "."
import type { Secrets } from "@/models/secrets/types.js"
import type { ConfigKey } from "@/models/config/types.js"
import { resolveConfig } from "@/models/config/index.js"
import { getJobSiteInfos } from "@/plugins/job-site/index.js"
import { getLlmProviders, createLlmClientForPing } from "@/plugins/llm/index.js"
import {
  getCommuteProviders,
  createCommuteClient,
} from "@/plugins/commute/index.js"
import {
  LLM_SECRET_KEYS,
  COMMUTE_SECRET_KEYS,
  maskedSecretsFor,
  resolveSecretKey,
} from "./ipc-utilities.js"
import type { IpcHandle } from "./ipc-handlers.js"

export function registerSettingsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  // Sites
  handle("sites:list", () => ({ sites: getJobSiteInfos() }))

  // Settings: LLM secrets
  handle("settings:llm:secrets", () =>
    maskedSecretsFor(LLM_SECRET_KEYS, services.secretsRepo.load()),
  )
  handle(
    "settings:llm:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(services, providerId, value, LLM_SECRET_KEYS),
  )
  handle("settings:llm:secret:clear", async (providerId: string) =>
    clearProviderSecret(services, providerId, LLM_SECRET_KEYS),
  )
  handle("settings:llm:secret:test", (providerId: string) =>
    testProviderSecret(services, providerId, LLM_SECRET_KEYS),
  )

  // Settings: Commute secrets
  handle("settings:commute:secrets", () =>
    maskedSecretsFor(COMMUTE_SECRET_KEYS, services.secretsRepo.load()),
  )
  handle(
    "settings:commute:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(services, providerId, value, COMMUTE_SECRET_KEYS),
  )
  handle("settings:commute:secret:clear", async (providerId: string) =>
    clearProviderSecret(services, providerId, COMMUTE_SECRET_KEYS),
  )
  handle("settings:commute:secret:test", (providerId: string) =>
    testProviderSecret(services, providerId, COMMUTE_SECRET_KEYS),
  )

  // Provider info
  handle("settings:llm-providers", () => getLlmProviders())
  handle("settings:commute-providers", () => getCommuteProviders())

  // E2E test helpers
  if (process.env.ELECTRON_TEST === "1") {
    handle("settings:secrets:load-raw", () => services.secretsRepo.load())
  }
  handle("settings:secrets:save", async (data: Secrets) => {
    await services.secretsRepo.save(data)
    services.rebuild()
    return { ok: true }
  })

  // LLM models
  handle("settings:llm-models", () => services.modelRegistry.fetchModels())

  // Config (non-secret settings)
  handle("settings:config:load", () =>
    resolveConfig(services.configRepo.load()),
  )
  handle("settings:config:save", async (key: ConfigKey, value: string) => {
    const config = services.configRepo.load()
    if (key === "provider") {
      config.provider = value === "requesty" ? "requesty" : "openrouter"
    } else {
      config[key] = value
    }
    await services.configRepo.save(config)
    services.rebuild()
    return { ok: true }
  })
}

async function saveProviderSecret(
  services: AppServices,
  providerId: string,
  value: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: true }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.secretsRepo.load()
  secrets[key] = value
  await services.secretsRepo.save(secrets)
  services.rebuild()
  return { ok: true }
}

async function clearProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: true }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.secretsRepo.load()
  delete secrets[key]
  await services.secretsRepo.save(secrets)
  services.rebuild()
  return { ok: true }
}

async function testProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: boolean; error?: string }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.secretsRepo.load()
  const value = secrets[key]
  if (!value) return { ok: false, error: "Kein Schlüssel gesetzt" }
  const ok =
    mapping === LLM_SECRET_KEYS
      ? await createLlmClientForPing(providerId, value).ping()
      : await createCommuteClient(providerId, value).ping()
  return { ok }
}
