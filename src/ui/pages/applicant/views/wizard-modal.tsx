import { useState } from "react"
import {
  createDefaultApplicantDraftSnapshot,
  isMeaningfulApplicantDraftSnapshot,
} from "@/models/applicant"
import type { ApplicantDraftSnapshot } from "@/models/applicant/types"
import {
  useDeleteApplicantDraft,
  useFinalizeApplicantDraft,
  useSaveApplicantDraft,
} from "@/ui/data"
import { useAutoSaveForm, type AutoSaveStatus } from "@/ui/hooks"
import type { UseFormReturn } from "react-hook-form"
import {
  WizardCancelChoicesModal,
  WizardModalShell,
} from "@/ui/pages/applicant/components"
import {
  createDraftWizardMutations,
  useDraftWizardLifecycle,
} from "@/ui/pages/applicant/hooks"
import {
  fromApplicantFormValues,
  toApplicantFormValues,
  type ApplicantFormValues,
} from "./editor-form"
import { ApplicantEditorPersonalView } from "./shared-personal"
import { ApplicantEditorExperienceView } from "./shared-experience"
import { ApplicantEditorEducationView } from "./shared-education"
import { ApplicantEditorCertificationsView } from "./shared-certifications"
import { ApplicantEditorOtherView } from "./shared-other"

export function ApplicantWizardModal({
  open,
  initialSnapshot,
  onClose,
  onFinished,
}: ApplicantWizardModalProperties) {
  const [step, setStep] = useState<ApplicantWizardStep>("personal")
  const saveDraft = useSaveApplicantDraft()
  const deleteDraft = useDeleteApplicantDraft()
  const finalizeDraft = useFinalizeApplicantDraft()

  const form = useAutoSaveForm<ApplicantFormValues, ApplicantDraftSnapshot>({
    queryResult: { data: initialSnapshot, isLoading: false },
    toFormValues: toApplicantFormValues,
    onSave: async (formData) => {
      await saveDraft.mutateAsync(fromApplicantFormValues(formData))
    },
    formOptions: { defaultValues: toApplicantFormValues(initialSnapshot) },
    shouldFlushOnUnmount: () => lifecycle.shouldFlushOnUnmount(),
  })

  const watchedSnapshot = fromApplicantFormValues(form.watch())
  const lifecycle = useDraftWizardLifecycle({
    snapshot: watchedSnapshot,
    isMeaningful: isMeaningfulApplicantDraftSnapshot,
    ...createDraftWizardMutations({ saveDraft, deleteDraft, finalizeDraft }),
    onClose,
    onFinished: ({ id }) => onFinished(id),
  })

  return (
    <>
      <WizardModalShell
        open={open}
        onClose={lifecycle.cancelWizard}
        title="Neuen Bewerber erstellen"
        stepLabel={`Schritt ${resolveStepIndex(step)} von ${WIZARD_STEPS.length}: ${STEP_LABELS[step]}`}
        maxWidthClassName="max-w-5xl"
        onBack={
          step === "personal"
            ? undefined
            : () => setStep(previousWizardStep(step))
        }
        onNext={
          step === "other" ? undefined : () => setStep(nextWizardStep(step))
        }
        onFinish={step === "other" ? lifecycle.finishWizard : undefined}
        finishDisabled={!canFinalizeApplicantWizard(watchedSnapshot)}
      >
        <ApplicantWizardStepView form={form} step={step} />
      </WizardModalShell>

      <WizardCancelChoicesModal
        open={lifecycle.showCancelChoices}
        onContinue={lifecycle.closeCancelChoices}
        onKeepDraft={lifecycle.keepDraftAndClose}
        onDiscard={lifecycle.discardDraftAndClose}
      />
    </>
  )
}

export function createFreshApplicantWizardSnapshot(): ApplicantDraftSnapshot {
  return createDefaultApplicantDraftSnapshot()
}

export function canFinalizeApplicantWizard(
  snapshot: ApplicantDraftSnapshot,
): boolean {
  return snapshot.personal.name.trim().length > 0
}

interface ApplicantWizardModalProperties {
  open: boolean
  initialSnapshot: ApplicantDraftSnapshot
  onClose: () => void
  onFinished: (applicantId: string) => void
}

function ApplicantWizardStepView({
  form,
  step,
}: ApplicantWizardStepViewProperties) {
  const properties = {
    form,
    isLoading: form.isLoading,
    saveStatus: form.saveStatus,
    useHeaderAutoSave: false,
  }

  if (step === "personal") {
    return <ApplicantEditorPersonalView {...properties} />
  }
  if (step === "experience") {
    return <ApplicantEditorExperienceView {...properties} />
  }
  if (step === "education") {
    return <ApplicantEditorEducationView {...properties} />
  }
  if (step === "certifications") {
    return <ApplicantEditorCertificationsView {...properties} />
  }
  return <ApplicantEditorOtherView {...properties} />
}

type ApplicantWizardStep =
  | "personal"
  | "experience"
  | "education"
  | "certifications"
  | "other"

const STEP_LABELS: Record<ApplicantWizardStep, string> = {
  personal: "Persönlich",
  experience: "Berufserfahrung",
  education: "Ausbildung",
  certifications: "Zertifikate",
  other: "Sonstiges",
}

interface ApplicantWizardStepViewProperties {
  form: UseFormReturn<ApplicantFormValues> & {
    isLoading: boolean
    saveStatus: AutoSaveStatus
  }
  step: ApplicantWizardStep
}

function resolveStepIndex(step: ApplicantWizardStep): number {
  return WIZARD_STEPS.indexOf(step) + 1
}

function nextWizardStep(step: ApplicantWizardStep): ApplicantWizardStep {
  const currentIndex = WIZARD_STEPS.indexOf(step)
  const nextIndex = Math.min(currentIndex + 1, WIZARD_STEPS.length - 1)
  return WIZARD_STEPS[nextIndex]
}

function previousWizardStep(step: ApplicantWizardStep): ApplicantWizardStep {
  const currentIndex = WIZARD_STEPS.indexOf(step)
  const previousIndex = Math.max(currentIndex - 1, 0)
  return WIZARD_STEPS[previousIndex]
}

const WIZARD_STEPS: ApplicantWizardStep[] = [
  "personal",
  "experience",
  "education",
  "certifications",
  "other",
]
