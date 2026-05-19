import { useEffect, useState } from "react"

import { useNavigate } from "react-router"

import { Applicant } from "@/models/applicant"

import type { Applicant as ApplicantType } from "@/models/applicant"

import {
  useApplicantDraft,
  useDeleteApplicantDraft,
  useFinalizeApplicantDraft,
  useSaveApplicantDraft,
} from "@/ui/data"

import {
  useAutoSaveForm,
  type AutoSaveStatus,
  createDraftWizardMutations,
  useDraftWizardLifecycle,
  useDraftWizardInitialization,
} from "@/ui/hooks"

import { DraftWizardPage, useFirstStartWizardContext } from "@/ui/layout"
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

export default function ApplicantWizardPage({
  initialStep,
  onStepChange,
}: ApplicantWizardPageProperties = {}) {
  const navigate = useNavigate()
  const firstStart = useFirstStartWizardContext()
  const [phase, setPhase] = useState<Phase>("loading")
  const [step, setStep] = useState<ApplicantWizardStep>(
    initialStep ?? "personal",
  )
  const [resolvedSnapshot, setResolvedSnapshot] = useState<
    ApplicantType | undefined
  >()

  const draftQuery = useApplicantDraft()
  const deleteDraft = useDeleteApplicantDraft()
  const saveDraft = useSaveApplicantDraft()
  const finalizeDraft = useFinalizeApplicantDraft()

  useDraftWizardInitialization({
    refetch: () => draftQuery.refetch(),
    createDefaultSnapshot: () => new Applicant(),
    setResolvedSnapshot,
    setPhase,
    skipResumePrompt: firstStart.skipDraftResume,
  })

  useEffect(() => {
    if (initialStep) {
      setStep(initialStep)
    }
  }, [initialStep])

  const isEditing = phase === "editing"

  const form = useAutoSaveForm<ApplicantFormValues, ApplicantType>({
    queryResult: {
      data: isEditing ? resolvedSnapshot : undefined,
      isLoading: !isEditing,
    },
    toFormValues: toApplicantFormValues,
    onSave: async (formData) => {
      await saveDraft.mutateAsync(fromApplicantFormValues(formData))
    },
    formOptions: {
      defaultValues: toApplicantFormValues(new Applicant()),
    },
    shouldFlushOnUnmount: () => lifecycle.shouldFlushOnUnmount(),
  })

  const watchedSnapshot = fromApplicantFormValues(form.watch())
  const lifecycle = useDraftWizardLifecycle({
    snapshot: watchedSnapshot,
    isMeaningful: (snapshot) => snapshot.isDifferentFromDefault(),
    ...createDraftWizardMutations({ saveDraft, deleteDraft, finalizeDraft }),
    onClose: () => {
      void navigate("/")
    },
    onFinished: ({ id }) => {
      if (firstStart.isInFirstStart) {
        firstStart.onPhaseComplete({
          applicantId: id,
          nextPhase: "job-search",
          nextStep: "parameters",
        })
        return
      }

      void navigate(`/applicants/${id}`)
    },
  })

  function handleStepChange(nextStep: ApplicantWizardStep) {
    setStep(nextStep)
    onStepChange?.(nextStep, watchedSnapshot)
  }

  return (
    <>
      <DraftWizardPage
        phase={phase}
        title="Neuen Bewerber erstellen"
        steps={
          [
            "personal",
            "experience",
            "education",
            "certifications",
            "other",
          ] as const
        }
        currentStep={step}
        stepLabels={STEP_LABELS}
        setStep={handleStepChange}
        onCancel={() => void lifecycle.cancelWizard()}
        onFinish={lifecycle.finishWizard}
        finishDisabled={!canFinalizeApplicantWizard(watchedSnapshot)}
        resumePrompt={{
          description:
            "Es gibt einen fortsetzbaren Bewerberentwurf. Möchten Sie fortsetzen oder neu starten?",
          discardLabel: "Neu starten",
          onResume: () => setPhase("editing"),
          onDiscardAndStartFresh: async () => {
            await deleteDraft.mutateAsync()
            setResolvedSnapshot(new Applicant())
            setPhase("editing")
          },
        }}
      >
        <ApplicantWizardStepView form={form} step={step} />
      </DraftWizardPage>

      <WizardCancelChoicesModal
        open={lifecycle.showCancelChoices}
        onContinue={lifecycle.closeCancelChoices}
        onKeepDraft={lifecycle.keepDraftAndClose}
        onDiscard={lifecycle.discardDraftAndClose}
      />
    </>
  )
}

interface ApplicantWizardPageProperties {
  initialStep?: ApplicantWizardStep
  onStepChange?: (step: ApplicantWizardStep, snapshot: ApplicantType) => void
}

function canFinalizeApplicantWizard(snapshot: ApplicantType): boolean {
  return snapshot.personal.name.trim().length > 0
}

type Phase = "loading" | "resume-prompt" | "editing"

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

  const StepView = (
    {
      personal: ApplicantEditorPersonalView,
      experience: ApplicantEditorExperienceView,
      education: ApplicantEditorEducationView,
      certifications: ApplicantEditorCertificationsView,
      other: ApplicantEditorOtherView,
    } satisfies Record<ApplicantWizardStep, StepView>
  )[step]

  return <StepView {...properties} />
}

interface ApplicantWizardStepViewProperties {
  form: ReturnType<typeof useAutoSaveForm<ApplicantFormValues, ApplicantType>>
  step: ApplicantWizardStep
}

interface ApplicantWizardStepViewSharedProperties {
  form: ReturnType<typeof useAutoSaveForm<ApplicantFormValues, ApplicantType>>
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}

const STEP_LABELS: Record<ApplicantWizardStep, string> = {
  personal: "Persönlich",
  experience: "Berufserfahrung",
  education: "Ausbildung",
  certifications: "Zertifikate",
  other: "Sonstiges",
}

type ApplicantWizardStep =
  | "personal"
  | "experience"
  | "education"
  | "certifications"
  | "other"

type StepView = (
  properties: ApplicantWizardStepViewSharedProperties,
) => React.JSX.Element
