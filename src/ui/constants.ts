export { SEARCH_MODE_LABELS } from "@/models/job-search/index.js";
export { MATCH_SCORE_LABELS, STATUS_COLORS } from "@/models/vacancy/index.js";
import * as vacancyConstants from "@/models/vacancy/index.js";
import type { StatusLabelKey } from "@/models/vacancy/index.js";

export function getStatusLabel(status: StatusLabelKey): string {
  return vacancyConstants.STATUS_LABELS[status];
}
