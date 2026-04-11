import { useState } from "react"

import { useNavigate } from "react-router"

import {
  createDefaultApplicantDraftSnapshot,
  isMeaningfulApplicantDraftSnapshot,
} from "@/models/applicant"

import type { ApplicantDraftSnapshot } from "@/models/applicant/types"

import {
  useApplicantDraft,
  useDeleteApplicantDraft,
  useFinalizeApplicantDraft,
  useSaveApplicantDraft,
} from "@/ui/data"

import {
  useAutoSaveForm,
  createDraftWizardMutations,
  useDraftWizardLifecycle,
  useDraftWizardInitialization,
} from "@/ui/hooks"

import { WizardLayout, buildWizardSteps } from "@/ui/layout"
import { WizardCancelChoicesModal } from "@/ui/components"

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

export default function ApplicantWizardPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>("loading")
  const [step, setStep] = useState<ApplicantWizardStep>("personal")
  const [resolvedSnapshot, setResolvedSnapshot] = useState<
    ApplicantDraftSnapshot | undefined
  >()

  const draftQuery = useApplicantDraft()
  const deleteDraft = useDeleteApplicantDraft()
  const saveDraft = useSaveApplicantDraft()
  const finalizeDraft = useFinalizeApplicantDraft()

  useDraftWizardInitialization({
    refetch: () => draftQuery.refetch(),
    createDefaultSnapshot: createDefaultApplicantDraftSnapshot,
    setResolvedSnapshot,
    setPhase,
  })

  const isEditing = phase === "editing"

  const form = useAutoSaveForm<ApplicantFormValues, ApplicantDraftSnapshot>({
    queryResult: {
      data: isEditing ? resolvedSnapshot : undefined,
      isLoading: !isEditing,
    },
    toFormValues: toApplicantFormValues,
    onSave: async (formData) => {
      await saveDraft.mutateAsync(fromApplicantFormValues(formData))
    },
    formOptions: {
      defaultValues: toApplicantFormValues(
        createDefaultApplicantDraftSnapshot(),
      ),
    },
    shouldFlushOnUnmount: () => lifecycle.shouldFlushOnUnmount(),
  })

  const watchedSnapshot = fromApplicantFormValues(form.watch())
  const lifecycle = useDraftWizardLifecycle({
    snapshot: watchedSnapshot,
    isMeaningful: isMeaningfulApplicantDraftSnapshot,
    ...createDraftWizardMutations({ saveDraft, deleteDraft, finalizeDraft }),
    onClose: () => {
      void navigate("/")
    },
    onFinished: ({ id }) => {
      void navigate(`/applicants/${id}`)
    },
  })

  const wizardSteps = buildWizardSteps(WIZARD_STEPS, STEP_LABELS, step)

  if (phase === "loading") {
    return (
      <WizardLayout
        title="Neuen Bewerber erstellen"
        steps={wizardSteps}
        onCancel={() => {
          void navigate("/")
        }}
      >
        <div className="text-gray-500">Laden…</div>
      </WizardLayout>
    )
  }

  if (phase === "resume-prompt") {
    return (
      <WizardLayout
        title="Neuen Bewerber erstellen"
        steps={wizardSteps}
        onCancel={() => {
          void navigate("/")
        }}
      >
        <ResumeDraftPrompt
          description="Es gibt einen fortsetzbaren Bewerberentwurf. Möchten Sie fortsetzen oder neu starten?"
          onResume={() => setPhase("editing")}
          onDiscardAndStartFresh={async () => {
            await deleteDraft.mutateAsync()
            setResolvedSnapshot(createDefaultApplicantDraftSnapshot())
            setPhase("editing")
          }}
        />
      </WizardLayout>
    )
  }

  return (
    <>
      <WizardLayout
        title="Neuen Bewerber erstellen"
        steps={wizardSteps}
        onCancel={() => void lifecycle.cancelWizard()}
        onBack={
          step === "personal" ? undefined : () => setStep(previousStep(step))
        }
        onNext={step === "other" ? undefined : () => setStep(nextStep(step))}
        onFinish={step === "other" ? lifecycle.finishWizard : undefined}
        finishDisabled={!canFinalizeApplicantWizard(watchedSnapshot)}
      >
        <ApplicantWizardStepView form={form} step={step} />
      </WizardLayout>

      <WizardCancelChoicesModal
        open={lifecycle.showCancelChoices}
        onContinue={lifecycle.closeCancelChoices}
        onKeepDraft={lifecycle.keepDraftAndClose}
        onDiscard={lifecycle.discardDraftAndClose}
      />
    </>
  )
}

export function canFinalizeApplicantWizard(
  snapshot: ApplicantDraftSnapshot,
): boolean {
  return snapshot.personal.name.trim().length > 0
}

type Phase = "loading" | "resume-prompt" | "editing"

function ResumeDraftPrompt({
  description,
  onResume,
  onDiscardAndStartFresh,
}: ResumeDraftPromptProperties) {
  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Entwurf gefunden
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onResume}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Entwurf fortsetzen
        </button>
        <button
          type="button"
          onClick={() => void onDiscardAndStartFresh()}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Neu starten
        </button>
      </div>
    </div>
  )
}

interface ResumeDraftPromptProperties {
  description: string
  onResume: () => void
  onDiscardAndStartFresh: () => Promise<void>
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

  if (step === "personal")
    return <ApplicantEditorPersonalView {...properties} />
  if (step === "experience")
    return <ApplicantEditorExperienceView {...properties} />
  if (step === "education")
    return <ApplicantEditorEducationView {...properties} />
  if (step === "certifications")
    return <ApplicantEditorCertificationsView {...properties} />
  return <ApplicantEditorOtherView {...properties} />
}

interface ApplicantWizardStepViewProperties {
  form: ReturnType<
    typeof useAutoSaveForm<ApplicantFormValues, ApplicantDraftSnapshot>
  >
  step: ApplicantWizardStep
}

const STEP_LABELS: Record<ApplicantWizardStep, string> = {
  personal: "Persönlich",
  experience: "Berufserfahrung",
  education: "Ausbildung",
  certifications: "Zertifikate",
  other: "Sonstiges",
}

function nextStep(step: ApplicantWizardStep): ApplicantWizardStep {
  const index = WIZARD_STEPS.indexOf(step)
  return WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)]
}

function previousStep(step: ApplicantWizardStep): ApplicantWizardStep {
  const index = WIZARD_STEPS.indexOf(step)
  return WIZARD_STEPS[Math.max(index - 1, 0)]
}

const WIZARD_STEPS: ApplicantWizardStep[] = [
  "personal",
  "experience",
  "education",
  "certifications",
  "other",
]

type ApplicantWizardStep =
  | "personal"
  | "experience"
  | "education"
  | "certifications"
  | "other"
