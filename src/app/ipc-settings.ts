import type { ConfigKey } from "@/models/config"
import { getJobSiteInfos } from "@/plugins/job-site"
import { getLlmProviders, createLlmClientForPing } from "@/plugins/llm"
import { getCommuteProviders, getCommuteProvider } from "@/plugins/commute"
import {
  LLM_SECRET_KEYS,
  COMMUTE_SECRET_KEYS,
  maskedSecretsFor,
  resolveSecretKey,
} from "./ipc-utilities.js"
import type { IpcHandle } from "./ipc-handlers.js"
import type { AppServices } from "."

export function registerSettingsHandlers(
  handle: IpcHandle,
  services: AppServices,
): void {
  handle("sites:list", () => ({ sites: getJobSiteInfos() }))

  handle("settings:llm:secrets", () =>
    maskedSecretsFor(LLM_SECRET_KEYS, services.configRepo.loadSecrets()),
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

  handle("settings:commute:secrets", () =>
    maskedSecretsFor(COMMUTE_SECRET_KEYS, services.configRepo.loadSecrets()),
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

  handle("settings:llm-providers", () => getLlmProviders())
  handle("settings:commute-providers", () => getCommuteProviders())

  handle("settings:llm-models", () => services.modelRegistry.fetchModels())

  handle("settings:config:load", () => services.configRepo.loadConfig())
  handle("settings:config:save", async (key: ConfigKey, value: string) => {
    const config = services.configRepo.loadConfig()
    if (key === "provider") {
      config.provider = value === "requesty" ? "requesty" : "openrouter"
    } else {
      config[key] = value
    }
    await services.configRepo.saveConfig(config)
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
  const secrets = services.configRepo.loadSecrets()
  secrets[key] = value
  await services.configRepo.saveSecrets(secrets)
  services.rebuild()
  return { ok: true }
}

async function clearProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: true }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.configRepo.loadSecrets()
  delete secrets[key]
  await services.configRepo.saveSecrets(secrets)
  services.rebuild()
  return { ok: true }
}

async function testProviderSecret(
  services: AppServices,
  providerId: string,
  mapping: typeof LLM_SECRET_KEYS | typeof COMMUTE_SECRET_KEYS,
): Promise<{ ok: boolean; error?: string }> {
  const key = resolveSecretKey(providerId, mapping)
  const secrets = services.configRepo.loadSecrets()
  const value = secrets[key]
  if (!value) {
    return {
      ok: false,
      error: "Kein Schlüssel gesetzt",
    }
  }
  const ok =
    mapping === LLM_SECRET_KEYS
      ? await createLlmClientForPing(providerId, value).ping()
      : await getCommuteProvider(providerId).ping(value)
  return { ok }
}
