import type { PdfRenderer } from "@/plugins/pdf-renderer"

export function createStubPdfRenderer(
  fixedBuffer?: Buffer | Uint8Array,
): PdfRenderer {
  return new StubPdfRenderer(fixedBuffer)
}

class StubPdfRenderer implements PdfRenderer {
  constructor(private readonly fixedBuffer?: Buffer | Uint8Array) {}

  htmlToPdf(): Promise<Buffer | Uint8Array> {
    return Promise.resolve(this.fixedBuffer ?? Buffer.from("%PDF-1.4 stub"))
  }
}
