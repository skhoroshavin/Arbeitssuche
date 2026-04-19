import { createContext, useContext } from "react"

import type { SetupPhase } from "@/models/setup"

export interface FirstStartPhaseResult {
  nextPhase?: SetupPhase
  nextStep?: string
  applicantId?: string
  jobSearchId?: string
}

export function useFirstStartWizardContext(): FirstStartWizardContextValue {
  return useContext(FirstStartWizardContext)
}

export const FirstStartWizardContext =
  createContext<FirstStartWizardContextValue>({
    isInFirstStart: false,
    onPhaseComplete: () => {},
    skipDraftResume: false,
  })

interface FirstStartWizardContextValue {
  isInFirstStart: boolean
  onPhaseComplete: (result: FirstStartPhaseResult) => void
  skipDraftResume: boolean
}
