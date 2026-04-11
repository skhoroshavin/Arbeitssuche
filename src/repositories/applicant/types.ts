import type {
  Applicant,
  ApplicantDraft,
  ApplicantDraftSnapshot,
  ApplicantInfo,
} from "@/models/applicant/types.js"
import {
  resolveApplicant,
  resolveApplicantDraftSnapshot,
} from "@/models/applicant/index.js"
import { createUniqueDerivedId } from "@/utils/node/index.js"

export interface ApplicantRepository {
  list(): ApplicantInfo[]
  exists(id: string): boolean
  load(id: string): Applicant
  save(id: string, data: Applicant): void
  create(name: string): string
  delete(id: string): void
  loadDraft(): ApplicantDraft | undefined
  saveDraft(draft: ApplicantDraftSnapshot): void
  deleteDraft(): void
  finalizeDraft(): string
}

export function finalizeApplicantDraftData({
  snapshot,
  exists,
}: {
  snapshot: ApplicantDraftSnapshot
  exists: (candidate: string) => boolean
}): { id: string; data: Applicant } {
  const resolvedSnapshot = resolveApplicantDraftSnapshot(snapshot)
  const name = resolveDraftApplicantName(resolvedSnapshot)
  const id = createUniqueDerivedId(name, exists)
  return {
    id,
    data: resolveApplicant({ ...resolvedSnapshot, id }),
  }
}

function resolveDraftApplicantName(snapshot: ApplicantDraftSnapshot): string {
  const name = snapshot.personal.name.trim()
  return name.length > 0 ? name : "bewerber"
}
