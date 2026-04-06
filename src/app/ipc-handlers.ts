import { ipcMain, type WebContents } from "electron"
import type { AppServices } from "."
import { registerApplicantsHandlers } from "./ipc-applicants.js"
import { registerJobSearchesHandlers } from "./ipc-job-searches.js"
import { registerVacanciesHandlers } from "./ipc-vacancies.js"
import { registerCrawlHandlers } from "./ipc-crawl.js"
import { registerSettingsHandlers } from "./ipc-settings.js"

export type IpcHandle = <A extends unknown[], R>(
  channel: string,
  handler: (...arguments_: A) => R,
) => void

export type SafeSend = (channel: string, ...arguments_: unknown[]) => void

export function registerIpcHandlers(options: IpcHandlerOptions): void {
  const { services, getWebContents } = options
  const safeSend = createSafeSend(getWebContents)

  registerApplicantsHandlers(handle, services)
  registerJobSearchesHandlers(handle, services)
  registerVacanciesHandlers(handle, services, safeSend)
  registerCrawlHandlers(handle, services, safeSend)
  registerSettingsHandlers(handle, services)
}

interface IpcHandlerOptions {
  services: AppServices
  getWebContents: () => WebContents | undefined
}

function handle<A extends unknown[], R>(
  channel: string,
  handler: (...arguments_: A) => R,
): void {
  ipcMain.handle(channel, (_event, ...arguments_: A) => handler(...arguments_))
}

function createSafeSend(
  getWebContents: () => WebContents | undefined,
): SafeSend {
  return (channel, ...arguments_) => {
    const webContents = getWebContents()
    webContents?.send(channel, ...arguments_)
  }
}
