import { app } from "electron";
import path from "node:path";

export function getSecretsPath(): string {
  return path.join(getDataDirectory(), "secrets.enc");
}

export function getDataDirectory(): string {
  return path.join(app.getPath("userData"), "data");
}
