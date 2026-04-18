import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { useSaveSetupState, useSetupState } from "@/ui/data"
import { DraftWizardPage, useFirstStartWizardContext } from "@/ui/layout"
import { ConfirmationDialog } from "@/ui/pages/settings/components"
import SettingsAI from "./ai"
import SettingsMaps from "./maps"

export function FirstStartSettingsStep() {
  const { onPhaseComplete } = useFirstStartWizardContext()
  const setupState = useSetupState()
  const state = setupState.data?.state
  const saveSetup = useSaveSetupState()
  const navigate = useNavigate()
  const [step, setStep] = useState<SettingsStep>("ai")
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const hasInitialized = useRef(false)
  const persistedStep = useRef<SettingsStep | undefined>()

  useEffect(() => {
    if (hasInitialized.current || setupState.data === undefined) {
      return
    }

    const savedStep =
      state?.lastPhase === "settings"
        ? toSettingsStep(state.lastStep)
        : undefined

    if (savedStep) {
      persistedStep.current = savedStep
      setStep(savedStep)
    }

    hasInitialized.current = true
  }, [setupState.data, state])

  useEffect(() => {
    if (!hasInitialized.current) {
      return
    }

    if (persistedStep.current === step) {
      return
    }

    persistedStep.current = step

    void saveSetup
      .mutateAsync({
        completed: false,
        lastPhase: "settings",
        lastStep: step,
      })
      .catch(() => {
        if (persistedStep.current === step) {
          persistedStep.current = undefined
        }
      })
  }, [saveSetup, step])

  return (
    <>
      <DraftWizardPage
        phase="editing"
        title="Ersteinrichtung"
        steps={["ai", "maps"] as const}
        currentStep={step}
        stepLabels={SETTINGS_STEP_LABELS}
        setStep={setStep}
        onCancel={() => {
          void navigate("/", { replace: true })
        }}
        onSkip={() => setShowSkipWarning(true)}
        onFinish={() => {
          onPhaseComplete({ nextPhase: "applicant" })
          return Promise.resolve()
        }}
        resumePrompt={UNUSED_RESUME_PROMPT}
      >
        {step === "ai" ? (
          <SettingsAI showDangerZone={false} />
        ) : (
          <SettingsMaps />
        )}
      </DraftWizardPage>

      <ConfirmationDialog
        open={showSkipWarning}
        title="Konfiguration überspringen?"
        description="Ohne LLM- und Karten-Konfiguration funktionieren Kernfunktionen wie Analyse, Anschreiben und Pendelzeitberechnung nicht zuverlässig."
        confirmLabel="Trotzdem überspringen"
        destructive
        onCancel={() => setShowSkipWarning(false)}
        onConfirm={() => {
          setShowSkipWarning(false)
          onPhaseComplete({ nextPhase: "applicant" })
        }}
      />
    </>
  )
}

type SettingsStep = "ai" | "maps"

function toSettingsStep(step: string | undefined): SettingsStep | undefined {
  if (step === "maps") {
    return "maps"
  }

  if (step === "ai") {
    return "ai"
  }

  return undefined
}

const SETTINGS_STEP_LABELS: Record<SettingsStep, string> = {
  ai: "KI",
  maps: "Karten",
}

const UNUSED_RESUME_PROMPT = {
  description: "",
  discardLabel: "",
  onResume: () => {},
  onDiscardAndStartFresh: async () => {},
}
