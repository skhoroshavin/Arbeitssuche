import { useRef, useState } from "react"

export function useDraftWizardLifecycle<TSnapshot, TResult>({
  snapshot,
  isMeaningful,
  saveDraft,
  deleteDraft,
  finalizeDraft,
  onClose,
  onFinished,
}: DraftWizardLifecycleProperties<TSnapshot, TResult>) {
  const [showCancelChoices, setShowCancelChoices] = useState(false)
  const skipFlushOnUnmount = useRef(false)
  const meaningful = isMeaningful(snapshot)

  const cancelWizard = async () => {
    if (!meaningful) {
      skipFlushOnUnmount.current = true
      await deleteDraft()
      onClose()
      return
    }
    setShowCancelChoices(true)
  }

  const finishWizard = async () => {
    await saveDraft(snapshot)
    const result = await finalizeDraft()
    onFinished(result)
  }

  const keepDraftAndClose = async () => {
    await saveDraft(snapshot)
    setShowCancelChoices(false)
    onClose()
  }

  const discardDraftAndClose = async () => {
    skipFlushOnUnmount.current = true
    await deleteDraft()
    setShowCancelChoices(false)
    onClose()
  }

  return {
    showCancelChoices,
    meaningful,
    keepDraftAndClose,
    discardDraftAndClose,
    cancelWizard,
    finishWizard,
    shouldFlushOnUnmount: () => !skipFlushOnUnmount.current,
    closeCancelChoices: () => setShowCancelChoices(false),
  }
}

export function createDraftWizardMutations<TSnapshot, TResult>({
  saveDraft,
  deleteDraft,
  finalizeDraft,
}: DraftWizardMutationProperties<TSnapshot, TResult>) {
  return {
    saveDraft: async (snapshot: TSnapshot) => saveDraft.mutateAsync(snapshot),
    deleteDraft: async () => deleteDraft.mutateAsync(),
    finalizeDraft: async () => finalizeDraft.mutateAsync(),
  }
}

interface DraftWizardLifecycleProperties<TSnapshot, TResult> {
  snapshot: TSnapshot
  isMeaningful: (snapshot: TSnapshot) => boolean
  saveDraft: (snapshot: TSnapshot) => Promise<unknown>
  deleteDraft: () => Promise<unknown>
  finalizeDraft: () => Promise<TResult>
  onClose: () => void
  onFinished: (result: TResult) => void
}

interface DraftWizardMutationProperties<TSnapshot, TResult> {
  saveDraft: { mutateAsync: (snapshot: TSnapshot) => Promise<unknown> }
  deleteDraft: { mutateAsync: () => Promise<unknown> }
  finalizeDraft: { mutateAsync: () => Promise<TResult> }
}
