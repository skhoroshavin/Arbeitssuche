import {
  app,
  BrowserWindow,
  Menu,
  protocol,
  safeStorage,
  session,
  shell,
} from "electron"
import { rmSync } from "node:fs"
import path from "node:path"
import { registerIpcHandlers } from "./ipc.js"
import { registerAppProtocol } from "./protocol.js"
import { createAppServices, createSqliteServiceContext } from "."
import { createElectronStoreSetupRepository } from "./setup"
import { Database } from "@/utils/index.js"
import { getDataDirectory, getSecretsPath } from "./data-paths.js"
import { createConfigRepository } from "@/repositories/config"
import { createElectronKVStore } from "@/plugins/kvstore"
import { createElectronCipher, createStubCipher } from "@/plugins/cipher"
import type { AppServices } from "."

let mainWindow: BrowserWindow | undefined
let appDatabase: Database | undefined
let currentServices: AppServices | undefined

const isDevelopment = process.env.NODE_ENV === "development"
const isTest = process.env.ELECTRON_TEST === "1"

// Isolate Chrome user-data per test instance to avoid lock conflicts
if (isTest && process.env.ELECTRON_TEST_DATA_DIR) {
  app.setPath("userData", process.env.ELECTRON_TEST_DATA_DIR)
}

// Register custom protocol before app is ready
if (!isDevelopment) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ])
}

void (async () => {
  await app.whenReady()

  Menu.setApplicationMenu(null)
  const dataDirectory = isTest
    ? (process.env.ELECTRON_TEST_DATA_DIR ?? "data")
    : getDataDirectory()
  const databasePath = path.join(dataDirectory, "arbeitssuche.db")
  const secretsPath = getSecretsPath()

  // Register custom protocol handler for serving renderer files
  if (!isDevelopment) {
    registerAppProtocol(getRendererDirectory())
  }

  // Deny all permission requests (camera, microphone, geolocation, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) =>
    callback(false),
  )

  appDatabase = Database.open(databasePath)

  const kvStore = createElectronKVStore()
  const cipher = isTest ? createStubCipher() : createElectronCipher()
  const configRepo = createConfigRepository(kvStore, cipher, {
    secretsFilePath: isTest ? undefined : secretsPath,
  })
  const setupRepo = createElectronStoreSetupRepository()

  currentServices = createAppServices(
    createSqliteServiceContext(appDatabase, configRepo, setupRepo),
  )
  const services = createMutableAppServices(() => getCurrentServices())

  registerIpcHandlers({
    services,
    getWebContents: () => mainWindow?.webContents,
    closeDatabase: () => getCurrentDatabase().close(),
    deleteDatabaseFiles: () => deleteDatabaseFiles(databasePath),
    reopenDatabase: () => {
      appDatabase = Database.open(databasePath)
      currentServices = createAppServices(
        createSqliteServiceContext(appDatabase, configRepo, setupRepo),
      )
    },
    closeApp: () => app.quit(),
  })

  await createAndShowWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAndShowWindow().catch(console.error)
    }
  })

  app.on("window-all-closed", () => {
    app.quit()
  })

  app.on("before-quit", () => {
    appDatabase?.close()
  })
})()

function getCurrentDatabase(): Database {
  if (!appDatabase) throw new Error("App database not initialized")
  return appDatabase
}

function getCurrentServices(): AppServices {
  if (!currentServices) throw new Error("App services not initialized")
  return currentServices
}

function getRendererDirectory(): string {
  return path.join(__dirname, "../renderer")
}

function deleteDatabaseFiles(databasePath: string): void {
  rmSync(databasePath, { force: true })
  rmSync(`${databasePath}-shm`, { force: true })
  rmSync(`${databasePath}-wal`, { force: true })
}

async function createAndShowWindow(): Promise<void> {
  mainWindow = createBrowserWindow()
  await (isDevelopment
    ? mainWindow.loadURL("http://localhost:5173")
    : mainWindow.loadURL("app://./"))
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url).catch(console.error)
    }
    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const isInternal =
      url.startsWith("http://localhost:") || url.startsWith("app://")
    if (!isInternal) {
      event.preventDefault()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = undefined
  })
}

function createBrowserWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1080,
    height: 900,
    show: !isTest,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDevelopment || isTest,
    },
  })
}

function createMutableAppServices(getServices: () => AppServices): AppServices {
  return {
    get applicantRepo() {
      return getServices().applicantRepo
    },
    get jobSearchRepo() {
      return getServices().jobSearchRepo
    },
    get vacancyRepo() {
      return getServices().vacancyRepo
    },
    get configRepo() {
      return getServices().configRepo
    },
    get setupRepo() {
      return getServices().setupRepo
    },
    get modelRegistry() {
      return getServices().modelRegistry
    },
    get resumeRenderer() {
      return getServices().resumeRenderer
    },
    get jobConsultant() {
      return getServices().jobConsultant
    },
    get vacancyEnricher() {
      return getServices().vacancyEnricher
    },
    get vacancyScanner() {
      return getServices().vacancyScanner
    },
    get coverLetterWriter() {
      return getServices().coverLetterWriter
    },
    rebuild() {
      getServices().rebuild()
    },
  }
}
