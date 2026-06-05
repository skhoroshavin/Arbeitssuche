import { test as base, type ElectronApplication } from "@playwright/test"
import {
  createE2eDataDir,
  launchElectronApp,
  prepareFirstWindow,
  removeE2eDataDir,
} from "./helpers/electron-launch.js"
import {
  ApplicantListPage,
  ApplicantPage,
  FirstStartPage,
  JobSearchPage,
  LayoutPage,
  SettingsPage,
} from "./pages/index.js"

type Fixtures = {
  electronApp: ElectronApplication
  firstStartPage: FirstStartPage
  applicantListPage: ApplicantListPage
  applicantPage: ApplicantPage
  jobSearchPage: JobSearchPage
  layoutPage: LayoutPage
  settingsPage: SettingsPage
}

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
    const dataDir = createE2eDataDir()
    const electronApp = await launchElectronApp(dataDir)

    try {
      await use(electronApp)
    } finally {
      await electronApp.close()
      removeE2eDataDir(dataDir)
    }
  },

  page: async ({ electronApp }, use) => {
    await use(await prepareFirstWindow(electronApp))
  },

  firstStartPage: async ({ page }, use) => {
    await use(new FirstStartPage(page))
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
