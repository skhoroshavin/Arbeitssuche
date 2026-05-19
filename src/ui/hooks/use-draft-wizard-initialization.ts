import { useEffect } from "react"

export function useDraftWizardInitialization<TSnapshot>({
  refetch,
  createDefaultSnapshot,
  setResolvedSnapshot,
  setPhase,
  skipResumePrompt = false,
}: DraftWizardInitializationOptions<TSnapshot>): void {
  useEffect(() => {
    async function initWizard() {
      const result = await refetch()
      const draft = result.data?.draft
      if (draft) {
        setResolvedSnapshot(draft)
        setPhase(skipResumePrompt ? "editing" : "resume-prompt")
      } else {
        setResolvedSnapshot(createDefaultSnapshot())
        setPhase("editing")
      }
    }

    void initWizard()
  }, [])
}

interface DraftWizardInitializationOptions<TSnapshot> {
  refetch: () => Promise<{
    data?: { draft?: TSnapshot | null } | undefined
  }>
  createDefaultSnapshot: () => TSnapshot
  setResolvedSnapshot: (snapshot: TSnapshot) => void
  setPhase: (phase: "resume-prompt" | "editing") => void
  skipResumePrompt?: boolean
}
