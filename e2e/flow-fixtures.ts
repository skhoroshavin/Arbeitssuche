import {
  test as base,
  type ElectronApplication,
  type Page,
} from "@playwright/test"
import {
  ApplicantListPage,
  ApplicantPage,
  FirstStartPage,
  JobSearchPage,
  LayoutPage,
  SettingsPage,
} from "./pages/index.js"
import {
  createE2eDataDir,
  launchElectronApp,
  prepareFirstWindow,
  removeE2eDataDir,
} from "./helpers/electron-launch.js"

interface FlowSession {
  readonly electronApp: ElectronApplication
  readonly page: Page
  relaunch: () => Promise<void>
}

type WorkerFixtures = {
  flowSession: FlowSession
}

type Fixtures = {
  electronApp: ElectronApplication
  firstStartPage: FirstStartPage
  applicantListPage: ApplicantListPage
  applicantPage: ApplicantPage
  jobSearchPage: JobSearchPage
  layoutPage: LayoutPage
  settingsPage: SettingsPage
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  flowSession: [
    async ({}, use) => {
      const dataDir = createE2eDataDir()
      let electronApp = await launchElectronApp(dataDir)
      let page = await prepareFirstWindow(electronApp)

      const flowSession: FlowSession = {
        get electronApp() {
          return electronApp
        },
        get page() {
          return page
        },
        relaunch: async () => {
          await electronApp.close()
          electronApp = await launchElectronApp(dataDir)
          page = await prepareFirstWindow(electronApp)
        },
      }

      try {
        await use(flowSession)
      } finally {
        await electronApp.close()
        removeE2eDataDir(dataDir)
      }
    },
    { scope: "worker" },
  ],

  electronApp: async ({ flowSession }, use) => {
    await use(flowSession.electronApp)
  },

  page: async ({ flowSession }, use) => {
    await use(flowSession.page)
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
