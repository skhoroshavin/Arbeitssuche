import type { ApplicantRepository } from "@/repositories/applicant/types.js";
import type { PdfRenderer } from "@/plugins/pdf-renderer/types.js";
import { RESUME_TEMPLATES } from "@/models/applicant/types.js";
import { prepareResumeData } from "@/services/resume-renderer/prepare-resume-data.js";
import {
  renderHTML,
  templatesDir,
} from "@/services/resume-renderer/renderer.js";

export class ResumeRenderer {
  constructor(
    private readonly applicantRepo: ApplicantRepository,
    private readonly pdfRenderer: PdfRenderer,
  ) {}

  async generate(
    applicantId: string,
    template: string,
  ): Promise<Buffer | Uint8Array> {
    if (!template || !RESUME_TEMPLATES.some((t) => t === template)) {
      throw new Error(
        `Invalid template. Must be one of: ${RESUME_TEMPLATES.join(", ")}`,
      );
    }

    const applicant = this.applicantRepo.load(applicantId);
    const resumeData = prepareResumeData(applicant);
    const html = renderHTML(templatesDir, template, resumeData);
    return this.pdfRenderer.htmlToPdf(html);
  }
}
