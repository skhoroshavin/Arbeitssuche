import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { REQUIRED_E2E_ENV } from "./live-e2e-setup.js"

const envFilePath = resolve(".env")
let envPrepared = false

export function createE2eDataDir(): string {
  return mkdtempSync(join(tmpdir(), "e2e-data-"))
}

export function removeE2eDataDir(dataDir: string): void {
  rmSync(dataDir, { recursive: true, force: true })
}

export async function launchElectronApp(
  dataDir: string,
): Promise<ElectronApplication> {
  ensureRequiredE2eEnvLoaded()
  const isCI = !!process.env.CI

  return electron.launch({
    args: [
      resolve("out/main/main.cjs"),
      ...(isCI ? ["--no-sandbox", "--disable-gpu"] : []),
    ],
    env: {
      ...createElectronEnvironment(),
      NODE_ENV: "production",
      ELECTRON_TEST: "1",
      ELECTRON_TEST_DATA_DIR: dataDir,
    },
  })
}

export async function prepareFirstWindow(
  electronApp: ElectronApplication,
): Promise<Page> {
  const page = await electronApp.firstWindow({ timeout: 60_000 })
  await page.waitForLoadState("domcontentloaded")
  bindRelativeGoto(page)
  return page
}

function bindRelativeGoto(page: Page): void {
  const currentUrl = page.url()
  const baseURL = currentUrl.startsWith("app://")
    ? "app://."
    : new URL(currentUrl).origin

  const originalGoto = page.goto.bind(page)
  const patchedGoto: typeof page.goto = (url, options) => {
    if (url.startsWith("/")) {
      return originalGoto(`${baseURL}${url}`, options)
    }
    return originalGoto(url, options)
  }
  page.goto = patchedGoto
}

function ensureRequiredE2eEnvLoaded(): void {
  if (envPrepared) return
  envPrepared = true

  if (!existsSync(envFilePath)) return

  process.loadEnvFile(envFilePath)
  applyRequiredE2eEnvOverrides(envFilePath)
}

function createElectronEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  for (const key of Object.keys(REQUIRED_E2E_ENV)) {
    delete environment[key]
  }
  return environment
}

function applyRequiredE2eEnvOverrides(filePath: string): void {
  const content = readFileSync(filePath, "utf8")

  for (const line of content.split("\n")) {
    const entry = line.trim()
    if (entry.length === 0 || entry.startsWith("#")) {
      continue
    }

    const separatorIndex = entry.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const name = entry.slice(0, separatorIndex).trim()
    if (!(name in REQUIRED_E2E_ENV)) {
      continue
    }

    process.env[name] = entry.slice(separatorIndex + 1).trim()
  }
}
