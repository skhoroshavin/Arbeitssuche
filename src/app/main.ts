import {
  app,
  BrowserWindow,
  protocol,
  safeStorage,
  session,
  shell,
} from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc-handlers.js";
import { registerAppProtocol } from "./protocol.js";
import { createAppServices, createSqliteServiceContext } from "./index.js";
import {
  createStubSecretsRepository,
  createEncryptedSecretsRepository,
} from "./secrets/index.js";
import { createElectronStoreConfigRepository } from "./config/index.js";
import { Database } from "@/repositories/database.js";
import { getDataDir, getSecretsPath } from "./data-paths.js";

let mainWindow: BrowserWindow | null = null;
let appDb: Database | null = null;

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.ELECTRON_TEST === "1";

// Isolate Chrome user-data per test instance to avoid lock conflicts
if (isTest && process.env.ELECTRON_TEST_DATA_DIR) {
  app.setPath("userData", process.env.ELECTRON_TEST_DATA_DIR);
}

function getRendererDir(): string {
  return join(__dirname, "../renderer");
}

function createBrowserWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1080,
    height: 900,
    show: !isTest,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev || isTest,
    },
  });
}

// Register custom protocol before app is ready
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

app.whenReady().then(async () => {
  const dataDir = isTest
    ? process.env.ELECTRON_TEST_DATA_DIR || "data"
    : getDataDir();

  // Register custom protocol handler for serving renderer files
  if (!isDev) {
    registerAppProtocol(getRendererDir());
  }

  // Deny all permission requests (camera, microphone, geolocation, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) =>
    cb(false),
  );

  const db = Database.open(join(dataDir, "arbeitssuche.db"));
  appDb = db;

  const secretsRepo = isTest
    ? createStubSecretsRepository()
    : createEncryptedSecretsRepository(getSecretsPath(), safeStorage);

  const configRepo = createElectronStoreConfigRepository();

  const services = createAppServices(
    createSqliteServiceContext(db, secretsRepo, configRepo),
  );

  registerIpcHandlers({
    services,
    getWebContents: () => mainWindow?.webContents,
  });

  async function createAndShowWindow(): Promise<void> {
    mainWindow = createBrowserWindow();
    if (isDev) {
      await mainWindow.loadURL("http://localhost:5173");
    } else {
      await mainWindow.loadURL("app://./");
    }
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
      const isInternal =
        url.startsWith("http://localhost:") || url.startsWith("app://");
      if (!isInternal) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }

  await createAndShowWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createAndShowWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  appDb?.close();
});
