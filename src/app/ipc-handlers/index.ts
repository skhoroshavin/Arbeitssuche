import { ipcMain, type WebContents } from "electron"
import type { AppServices } from "@/app/index.js"
import { registerApplicantsHandlers } from "./applicants.js"
import { registerJobSearchesHandlers } from "./job-searches.js"
import { registerVacanciesHandlers } from "./vacancies.js"
import { registerCrawlHandlers } from "./crawl.js"
import { registerSettingsHandlers } from "./settings.js"

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
  registerVacanciesHandlers(handle, services)
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
