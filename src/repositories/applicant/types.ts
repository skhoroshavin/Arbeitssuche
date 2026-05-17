import type {
  Applicant,
  ApplicantDraft,
  ApplicantDraftSnapshot,
  ApplicantInfo,
} from "@/models/applicant"

import { resolveApplicant } from "@/models/applicant/index.js"

import { createUniqueDerivedId } from "@/utils/index.js"

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

export function loadFinalizedApplicantDraft<TDraft>({
  draft,
  getSnapshot,
  exists,
  persist,
  clearDraft,
}: {
  draft: TDraft | undefined
  getSnapshot: (draft: TDraft) => ApplicantDraftSnapshot
  exists: (candidate: string) => boolean
  persist: (result: { id: string; data: Applicant }) => void
  clearDraft: () => void
}): string {
  if (!draft) throw new Error("Applicant draft not found")
  const finalized = finalizeApplicantDraftData(getSnapshot(draft), exists)
  persist(finalized)
  clearDraft()
  return finalized.id
}

function finalizeApplicantDraftData(
  snapshot: ApplicantDraftSnapshot,
  exists: (candidate: string) => boolean,
): { id: string; data: Applicant } {
  const resolvedSnapshot = resolveApplicant(snapshot)
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
