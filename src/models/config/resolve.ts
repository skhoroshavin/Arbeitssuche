import type { AppConfig } from "@/models/config/types.js";
import {
  DEFAULT_ASSESSMENT_MODEL,
  DEFAULT_COVER_LETTER_MODEL,
  DEFAULT_CONSULTATION_MODEL,
} from "@/models/config/types.js";

export interface ResolvedConfig {
  assessmentModel: string;
  coverLetterModel: string;
  consultationModel: string;
}

export function resolveConfig(config: AppConfig): ResolvedConfig {
  return {
    assessmentModel: config.assessmentModel || DEFAULT_ASSESSMENT_MODEL,
    coverLetterModel: config.coverLetterModel || DEFAULT_COVER_LETTER_MODEL,
    consultationModel: config.consultationModel || DEFAULT_CONSULTATION_MODEL,
  };
}
