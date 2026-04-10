import { BrowserWindow } from "electron"

import type { PdfRenderer } from "@/plugins/pdf-renderer/types.js"

export function createElectronPdfRenderer(): PdfRenderer {
  return new ElectronPdfRenderer()
}

class ElectronPdfRenderer implements PdfRenderer {
  async htmlToPdf(html: string): Promise<Buffer> {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    try {
      await win.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      )

      const pdfData = await win.webContents.printToPDF({
        pageSize: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true,
      })

      return Buffer.from(pdfData)
    } finally {
      win.destroy()
    }
  }
}
