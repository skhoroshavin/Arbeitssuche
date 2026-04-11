export function resumeDraftSnapshot<TSnapshot>({
  draft,
  openSnapshot,
  closePrompt,
}: ResumeDraftSnapshotProperties<TSnapshot>): void {
  if (draft) {
    openSnapshot(draft.snapshot)
  }
  closePrompt()
}

export function discardDraftAndOpen({
  deleteDraft,
  openFresh,
  closePrompt,
}: DiscardDraftAndOpenProperties): void {
  void runDiscardDraft(deleteDraft, openFresh, closePrompt)
}

export function closeDraftPrompt(
  setOpen: (value: boolean) => void,
): () => void {
  return () => setOpen(false)
}

interface ResumeDraftSnapshotProperties<TSnapshot> {
  draft?: { snapshot: TSnapshot }
  openSnapshot: (snapshot: TSnapshot) => void
  closePrompt: () => void
}

interface DiscardDraftAndOpenProperties {
  deleteDraft: () => Promise<unknown>
  openFresh: () => void
  closePrompt: () => void
}

async function runDiscardDraft(
  deleteDraft: () => Promise<unknown>,
  openFresh: () => void,
  closePrompt: () => void,
): Promise<void> {
  try {
    await deleteDraft()
    openFresh()
  } finally {
    closePrompt()
  }
}
