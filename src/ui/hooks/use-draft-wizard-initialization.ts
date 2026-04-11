import { useEffect } from "react"

export function useDraftWizardInitialization<TSnapshot>({
  refetch,
  createDefaultSnapshot,
  setResolvedSnapshot,
  setPhase,
}: DraftWizardInitializationOptions<TSnapshot>): void {
  useEffect(() => {
    async function initWizard() {
      const result = await refetch()
      const draft = result.data?.draft
      if (draft?.meaningful) {
        setResolvedSnapshot(draft.snapshot)
        setPhase("resume-prompt")
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
    data?:
      | { draft?: { meaningful: boolean; snapshot: TSnapshot } | null }
      | undefined
  }>
  createDefaultSnapshot: () => TSnapshot
  setResolvedSnapshot: (snapshot: TSnapshot) => void
  setPhase: (phase: "resume-prompt" | "editing") => void
}
