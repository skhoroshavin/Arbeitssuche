export interface PdfRenderer {
  htmlToPdf(html: string): Promise<Buffer | Uint8Array>
}

export { createElectronPdfRenderer } from "./electron"
export { createStubPdfRenderer } from "./stub"
