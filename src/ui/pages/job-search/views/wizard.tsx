import { useState } from "react"

import { useNavigate, useParams } from "react-router"

import type { UseFormSetValue, UseFormWatch } from "react-hook-form"

import {
  createDefaultJobSearchEditorSnapshot,
  isMeaningfulJobSearchEditorSnapshot,
} from "@/models/job-search"

import type { JobSearchEditorSnapshot } from "@/models/job-search/types"

import {
  useApiKeyStatus,
  useDeleteJobSearchDraft,
  useFinalizeJobSearchDraft,
  useGenerateDraftCoverLetter,
  useJobSearchDraft,
  useSaveJobSearchDraft,
  useSiteListView,
} from "@/ui/data"

import {
  useAutoSaveForm,
  createDraftWizardMutations,
  useDraftWizardLifecycle,
  useDraftWizardInitialization,
} from "@/ui/hooks"

import { WizardLayout, buildWizardSteps } from "@/ui/layout"
import { WizardCancelChoicesModal } from "@/ui/components"

import { JobSearchCoverLetterView, JobSearchSearchConfigView } from "@/ui/views"

import type {
  JobSearchConfigSection,
  JobSearchEditorConfigValue,
} from "@/ui/views"

export default function JobSearchWizardPage() {
  const { applicantId = "" } = useParams<{ applicantId: string }>()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>("loading")
  const [step, setStep] = useState<WizardStep_>("parameters")
  const [resolvedSnapshot, setResolvedSnapshot] = useState<
    JobSearchEditorSnapshot | undefined
  >()

  const draftQuery = useJobSearchDraft(applicantId)
  const deleteDraft = useDeleteJobSearchDraft(applicantId)
  const saveDraft = useSaveJobSearchDraft(applicantId)
  const finalizeDraft = useFinalizeJobSearchDraft(applicantId)
  const generateDraftCoverLetter = useGenerateDraftCoverLetter(applicantId)
  const siteList = useSiteListView()
  const { hasLlmKey } = useApiKeyStatus()

  useDraftWizardInitialization({
    refetch: () => draftQuery.refetch(),
    createDefaultSnapshot: createDefaultJobSearchEditorSnapshot,
    setResolvedSnapshot,
    setPhase,
  })

  const isEditing = phase === "editing"

  const { setValue, watch } = useAutoSaveForm<
    WizardFormValues,
    JobSearchEditorSnapshot
  >({
    queryResult: {
      data: isEditing ? resolvedSnapshot : undefined,
      isLoading: !isEditing,
    },
    toFormValues: mapSnapshotToFormValues,
    onSave: async (formValues) => {
      await saveDraft.mutateAsync(mapFormValuesToSnapshot(formValues))
    },
    shouldFlushOnUnmount: () => lifecycle.shouldFlushOnUnmount(),
    formOptions: {
      defaultValues: mapSnapshotToFormValues(
        createDefaultJobSearchEditorSnapshot(),
      ),
    },
  })

  const currentSnapshot = mapFormValuesToSnapshot(watch())
  const lifecycle = useDraftWizardLifecycle({
    snapshot: currentSnapshot,
    isMeaningful: isMeaningfulJobSearchEditorSnapshot,
    ...createDraftWizardMutations({ saveDraft, deleteDraft, finalizeDraft }),
    onClose: () => {
      void navigate(`/applicants/${applicantId}`)
    },
    onFinished: ({ id }) => {
      void navigate(`/job-searches/${id}/vacancies`, {
        state: { startInitialUpdate: true },
      })
    },
  })

  const wizardSteps = buildWizardSteps(WIZARD_STEPS, STEP_LABELS, step)

  if (phase === "loading") {
    return (
      <WizardLayout
        title="Neue Jobsuche erstellen"
        steps={wizardSteps}
        onCancel={() => {
          void navigate(`/applicants/${applicantId}`)
        }}
      >
        <div className="text-gray-500">Laden…</div>
      </WizardLayout>
    )
  }

  if (phase === "resume-prompt") {
    return (
      <WizardLayout
        title="Neue Jobsuche erstellen"
        steps={wizardSteps}
        onCancel={() => {
          void navigate(`/applicants/${applicantId}`)
        }}
      >
        <ResumeDraftPrompt
          onResume={() => setPhase("editing")}
          onDiscardAndStartFresh={async () => {
            await deleteDraft.mutateAsync()
            setResolvedSnapshot(createDefaultJobSearchEditorSnapshot())
            setPhase("editing")
          }}
        />
      </WizardLayout>
    )
  }

  const { onBack, onNext, onFinish } = resolveWizardNavigation(
    step,
    setStep,
    lifecycle,
  )

  return (
    <>
      <WizardLayout
        title="Neue Jobsuche erstellen"
        steps={wizardSteps}
        onCancel={() => {
          void lifecycle.cancelWizard()
        }}
        onBack={onBack}
        onNext={onNext}
        onFinish={onFinish}
      >
        <JobSearchWizardStepView
          step={step}
          watch={watch}
          setValue={setValue}
          saveDraft={saveDraft}
          currentSnapshot={currentSnapshot}
          generateDraftCoverLetter={generateDraftCoverLetter}
          allSites={siteList.data.sites}
          hasLlmKey={hasLlmKey}
        />
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

type Phase = "loading" | "resume-prompt" | "editing"

function ResumeDraftPrompt({
  onResume,
  onDiscardAndStartFresh,
}: ResumeDraftPromptProperties) {
  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Entwurf gefunden
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Es gibt eine fortsetzbare Jobsuche im Entwurf. Möchten Sie fortsetzen
        oder neu starten?
      </p>
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
          Entwurf verwerfen
        </button>
      </div>
    </div>
  )
}

interface ResumeDraftPromptProperties {
  onResume: () => void
  onDiscardAndStartFresh: () => Promise<void>
}

const STEP_LABELS: Record<WizardStep_, string> = {
  parameters: "Parameter",
  mode: "Modus",
  sources: "Quellen",
  preferences: "Einstellungen",
  "cover-letter": "Anschreiben",
}

function mapSnapshotToFormValues(
  snapshot: JobSearchEditorSnapshot,
): WizardFormValues {
  return {
    searchTerm: snapshot.params.searchTerm,
    radiusKm: snapshot.params.radiusKm,
    searchMode: snapshot.params.searchMode,
    sources: snapshot.params.sources,
    maxResults: snapshot.params.maxResults,
    maxDistanceKm: snapshot.preferences.maxDistanceKm,
    maxCommuteMinutes: snapshot.preferences.maxCommuteMinutes,
    freeText: snapshot.preferences.freeText,
    coverLetterContent: snapshot.coverLetterContent,
  }
}

function mapFormValuesToSnapshot(
  values: WizardFormValues,
): JobSearchEditorSnapshot {
  return {
    params: {
      searchTerm: values.searchTerm,
      radiusKm: values.radiusKm,
      searchMode: values.searchMode,
      sources: values.sources,
      maxResults: values.maxResults,
    },
    preferences: {
      maxDistanceKm: values.maxDistanceKm,
      maxCommuteMinutes: values.maxCommuteMinutes,
      freeText: values.freeText,
    },
    coverLetterContent: values.coverLetterContent,
  }
}

function resolveWizardNavigation(
  step: WizardStep_,
  setStep: (s: WizardStep_) => void,
  lifecycle: { finishWizard: () => Promise<void> },
) {
  return {
    onBack:
      step === "parameters"
        ? undefined
        : () => {
            setStep(previousStep(step))
          },
    onNext:
      step === "cover-letter"
        ? undefined
        : () => {
            setStep(nextStep(step))
          },
    onFinish: step === "cover-letter" ? lifecycle.finishWizard : undefined,
  }
}

function nextStep(step: WizardStep_): WizardStep_ {
  const index = WIZARD_STEPS.indexOf(step)
  return WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)]
}

function previousStep(step: WizardStep_): WizardStep_ {
  const index = WIZARD_STEPS.indexOf(step)
  return WIZARD_STEPS[Math.max(index - 1, 0)]
}

const WIZARD_STEPS: WizardStep_[] = [
  "parameters",
  "mode",
  "sources",
  "preferences",
  "cover-letter",
]

function JobSearchWizardStepView({
  step,
  watch,
  setValue,
  saveDraft,
  currentSnapshot,
  generateDraftCoverLetter,
  allSites,
  hasLlmKey,
}: JobSearchWizardStepViewProperties) {
  if (step === "cover-letter") {
    return (
      <JobSearchCoverLetterView
        value={{ content: watch("coverLetterContent") }}
        onUpdate={(value) => {
          setValue("coverLetterContent", value.content, { shouldDirty: true })
        }}
        onGenerate={() => {
          void saveDraft.mutateAsync(currentSnapshot).then(() =>
            generateDraftCoverLetter.mutate(undefined, {
              onSuccess: (result) => {
                setValue("coverLetterContent", result.content, {
                  shouldDirty: true,
                })
              },
            }),
          )
        }}
        isGenerating={generateDraftCoverLetter.isPending}
        isGenerateError={generateDraftCoverLetter.isError}
        llmAvailable={hasLlmKey}
        rows={18}
      />
    )
  }
  return (
    <JobSearchSearchConfigView
      sections={[step]}
      allSites={allSites}
      value={{
        searchTerm: watch("searchTerm"),
        radiusKm: watch("radiusKm"),
        searchMode: watch("searchMode"),
        sources: watch("sources"),
        maxResults: watch("maxResults"),
        maxDistanceKm: watch("maxDistanceKm"),
        maxCommuteMinutes: watch("maxCommuteMinutes"),
        freeText: watch("freeText"),
      }}
      onUpdate={(value) => applyWizardConfigValue(setValue, value)}
    />
  )
}

interface JobSearchWizardStepViewProperties {
  step: WizardStep_
  watch: UseFormWatch<WizardFormValues>
  setValue: UseFormSetValue<WizardFormValues>
  saveDraft: {
    mutateAsync: (snapshot: JobSearchEditorSnapshot) => Promise<unknown>
  }
  currentSnapshot: JobSearchEditorSnapshot
  generateDraftCoverLetter: GenerateDraftCoverLetter
  allSites: SiteEntry[]
  hasLlmKey: boolean
}

type WizardStep_ = JobSearchConfigSection | "cover-letter"

interface SiteEntry {
  name: string
  supportedModes: string[]
}

interface GenerateDraftCoverLetter {
  mutate: (
    variables: undefined,
    options: { onSuccess: (result: { content: string }) => void },
  ) => void
  isPending: boolean
  isError: boolean
}

function applyWizardConfigValue(
  setValue: UseFormSetValue<WizardFormValues>,
  configUpdate: JobSearchEditorConfigValue,
): void {
  setValue("searchTerm", configUpdate.searchTerm, { shouldDirty: true })
  setValue("radiusKm", configUpdate.radiusKm, { shouldDirty: true })
  setValue("searchMode", configUpdate.searchMode, { shouldDirty: true })
  setValue("sources", configUpdate.sources, { shouldDirty: true })
  setValue("maxResults", configUpdate.maxResults, { shouldDirty: true })
  setValue("maxDistanceKm", configUpdate.maxDistanceKm, { shouldDirty: true })
  setValue("maxCommuteMinutes", configUpdate.maxCommuteMinutes, {
    shouldDirty: true,
  })
  setValue("freeText", configUpdate.freeText, { shouldDirty: true })
}

interface WizardFormValues {
  searchTerm: string
  radiusKm: number
  searchMode: "employment" | "entry-level" | "apprenticeship"
  sources: string[]
  maxResults?: number
  maxDistanceKm?: number
  maxCommuteMinutes?: number
  freeText: string[]
  coverLetterContent: string
}
