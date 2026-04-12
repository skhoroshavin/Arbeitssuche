import type { ApplicantRepository } from "@/repositories/applicant/types.js"
import type { PdfRenderer } from "@/plugins/pdf-renderer/types.js"
import { RESUME_TEMPLATES } from "@/models/applicant/index.js"
import { prepareResumeData } from "./prepare-resume-data.js"
import path from "node:path"
import { renderHTML } from "./renderer.js"

export class ResumeRenderer {
  constructor(
    private readonly applicantRepo: ApplicantRepository,
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async generate(
    applicantId: string,
    template: string,
  ): Promise<Buffer | Uint8Array> {
    if (!template || !isSupportedTemplate(template)) {
      throw new Error(
        `Invalid template. Must be one of: ${RESUME_TEMPLATES.join(", ")}`,
      )
    }

    const applicant = this.applicantRepo.load(applicantId)
    const resumeData = prepareResumeData(applicant)
    const html = renderHTML(
      path.resolve(import.meta.dirname, "./templates"),
      template,
      resumeData,
    )
    return this.pdfRenderer.htmlToPdf(html)
  }
}

function isSupportedTemplate(template: string): boolean {
  for (const candidate of RESUME_TEMPLATES) {
    if (candidate === template) return true
  }
  return false
}
