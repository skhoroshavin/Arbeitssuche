import type { ReactNode } from "react"

import { buildWizardSteps, WizardLayout } from "./wizard-layout"
import { createWizardStepNavigation } from "./wizard-navigation"
import { WizardResumeDraftPrompt } from "./wizard-resume-draft-prompt"

export function DraftWizardPage<TStep extends string>({
  phase,
  title,
  steps,
  currentStep,
  stepLabels,
  setStep,
  onCancel,
  onSkip,
  onFinish,
  finishDisabled = false,
  resumePrompt,
  children,
}: DraftWizardPageProperties<TStep>) {
  const wizardSteps = buildWizardSteps(steps, stepLabels, currentStep)
  const navigation = createWizardStepNavigation({
    steps,
    currentStep,
    setStep,
    onFinish,
  })

  if (phase === "loading") {
    return (
      <WizardLayout title={title} steps={wizardSteps} onCancel={onCancel}>
        <div className="text-gray-500">Laden…</div>
      </WizardLayout>
    )
  }

  if (phase === "resume-prompt") {
    return (
      <WizardLayout title={title} steps={wizardSteps} onCancel={onCancel}>
        <WizardResumeDraftPrompt
          description={resumePrompt.description}
          discardLabel={resumePrompt.discardLabel}
          onResume={resumePrompt.onResume}
          onDiscardAndStartFresh={resumePrompt.onDiscardAndStartFresh}
        />
      </WizardLayout>
    )
  }

  return (
    <WizardLayout
      title={title}
      steps={wizardSteps}
      onCancel={onCancel}
      onSkip={onSkip}
      onBack={navigation.onBack}
      onNext={navigation.onNext}
      onFinish={navigation.onFinish}
      finishDisabled={finishDisabled}
    >
      {children}
    </WizardLayout>
  )
}

interface DraftWizardPageProperties<TStep extends string> {
  phase: "loading" | "resume-prompt" | "editing"
  title: string
  steps: readonly [TStep, ...TStep[]]
  currentStep: TStep
  stepLabels: Record<TStep, string>
  setStep: (step: TStep) => void
  onCancel: () => void
  onSkip?: () => void
  onFinish: () => Promise<void>
  finishDisabled?: boolean
  resumePrompt: {
    description: string
    discardLabel: string
    onResume: () => void
    onDiscardAndStartFresh: () => Promise<void>
  }
  children: ReactNode
}
