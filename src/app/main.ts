import {
  app,
  BrowserWindow,
  Menu,
  protocol,
  safeStorage,
  session,
  shell,
} from "electron"
import path from "node:path"
import { registerIpcHandlers } from "./ipc.js"
import { registerAppProtocol } from "./protocol.js"
import { createAppServices, createSqliteServiceContext } from "."
import {
  createStubSecretsRepository,
  createEncryptedSecretsRepository,
} from "./secrets"
import { createElectronStoreConfigRepository } from "./config"
import { Database } from "@/utils/node/index.js"
import { getDataDirectory, getSecretsPath } from "./data-paths.js"

let mainWindow: BrowserWindow | undefined

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

  // Register custom protocol handler for serving renderer files
  if (!isDevelopment) {
    registerAppProtocol(getRendererDirectory())
  }

  // Deny all permission requests (camera, microphone, geolocation, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) =>
    callback(false),
  )

  const appDatabase = Database.open(path.join(dataDirectory, "arbeitssuche.db"))

  const secretsRepo = isTest
    ? createStubSecretsRepository()
    : createEncryptedSecretsRepository(getSecretsPath(), safeStorage)

  const configRepo = createElectronStoreConfigRepository()

  const services = createAppServices(
    createSqliteServiceContext(appDatabase, secretsRepo, configRepo),
  )

  registerIpcHandlers({
    services,
    getWebContents: () => mainWindow?.webContents,
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
    appDatabase.close()
  })
})()

function getRendererDirectory(): string {
  return path.join(__dirname, "../renderer")
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
