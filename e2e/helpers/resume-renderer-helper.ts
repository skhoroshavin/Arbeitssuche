import path from "node:path"
import { expect } from "@playwright/test"
import { renderHTML } from "../../src/services/resume-renderer/renderer.js"
import { pdf } from "pdf-to-img"
import type { Page } from "@playwright/test"

export function expectPagesResumeToMatchSnapshots(
  pages: Buffer[],
  template: string,
): void {
  for (const [index, page_] of pages.entries()) {
    expect(page_).toMatchSnapshot(`${template}-page${index + 1}.png`)
  }
}

export async function renderResumePages(
  page: Page,
  template: string,
  resumeData: Record<string, unknown>,
): Promise<Buffer[]> {
  const html = renderHTML(
    path.resolve(
      import.meta.dirname,
      "../../src/services/resume-renderer/templates",
    ),
    template,
    resumeData,
  )

  await page.setContent(html, { waitUntil: "networkidle" })

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
    printBackground: true,
  })

  const pages: Buffer[] = []
  for await (const image of await pdf(pdfBuffer, { scale: 2 })) {
    pages.push(Buffer.from(image))
  }
  return pages
}
