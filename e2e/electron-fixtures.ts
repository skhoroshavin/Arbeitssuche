import {
  test as base,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test"
import { resolve } from "node:path"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ElectronApiHelper } from "./helpers/electron-api-helper.js"
import {
  ApplicantListPage,
  ApplicantPage,
  JobSearchPage,
  LayoutPage,
  SettingsPage,
} from "./pages/index.js"

const envFilePath = resolve(".env")

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath)
}

type Fixtures = {
  electronApp: ElectronApplication
  api: ElectronApiHelper
  applicantListPage: ApplicantListPage
  applicantPage: ApplicantPage
  jobSearchPage: JobSearchPage
  layoutPage: LayoutPage
  settingsPage: SettingsPage
}

const REQUIRED_E2E_ENV = {
  OPENROUTER_API_KEY: "OpenRouter",
  GOOGLE_MAPS_API_KEY: "Google Maps",
} as const

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
    assertRequiredE2eEnvironment()
    const dataDir = mkdtempSync(join(tmpdir(), "e2e-data-"))
    writeFileSync(
      join(dataDir, "config.json"),
      JSON.stringify({ setup: { completed: true } }),
    )
    const isCI = !!process.env.CI
    const electronApp = await electron.launch({
      args: [
        resolve("out/main/main.cjs"),
        ...(isCI ? ["--no-sandbox", "--disable-gpu"] : []),
      ],
      env: {
        ...process.env,
        NODE_ENV: "production",
        ELECTRON_TEST: "1",
        ELECTRON_TEST_DATA_DIR: dataDir,
      },
    })
    await use(electronApp)
    await electronApp.close()
    rmSync(dataDir, { recursive: true, force: true })
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow({ timeout: 60_000 })
    await page.waitForLoadState("domcontentloaded")

    // For app:// protocol, URL.origin returns "null", so extract base manually
    const currentUrl = page.url()
    const baseURL = currentUrl.startsWith("app://")
      ? "app://."
      : new URL(currentUrl).origin

    const originalGoto = page.goto.bind(page)
    page.goto = ((url: string, options?: Parameters<typeof page.goto>[1]) => {
      if (url.startsWith("/")) {
        return originalGoto(`${baseURL}${url}`, options)
      }
      return originalGoto(url, options)
    }) as typeof page.goto

    await use(page)
  },

  api: async ({ page }, use) => {
    await use(new ElectronApiHelper(page))
  },

  applicantListPage: async ({ page }, use) => {
    await use(new ApplicantListPage(page))
  },
  applicantPage: async ({ page }, use) => {
    await use(new ApplicantPage(page))
  },
  jobSearchPage: async ({ page }, use) => {
    await use(new JobSearchPage(page))
  },
  layoutPage: async ({ page }, use) => {
    await use(new LayoutPage(page))
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page))
  },
})

export { expect } from "@playwright/test"

function assertRequiredE2eEnvironment(): void {
  const missing = Object.entries(REQUIRED_E2E_ENV)
    .filter(([name]) => !process.env[name]?.trim())
    .map(([name, label]) => `${label} (${name})`)

  if (missing.length === 0) {
    return
  }

  throw new Error(
    `Missing required E2E environment variables: ${missing.join(", ")}`,
  )
}
