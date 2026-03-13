import { app } from "electron";
import { join } from "node:path";

export function getDataDir(): string {
  return join(app.getPath("userData"), "data");
}

export function getSecretsPath(): string {
  return join(getDataDir(), "secrets.enc");
}
