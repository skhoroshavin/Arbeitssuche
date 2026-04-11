import { useState } from "react"
import type { UseFormSetValue } from "react-hook-form"
import { isMeaningfulJobSearchEditorSnapshot } from "@/models/job-search"
import type { JobSearchEditorSnapshot } from "@/models/job-search/types"
import {
  useApiKeyStatus,
  useDeleteJobSearchDraft,
  useFinalizeJobSearchDraft,
  useGenerateDraftCoverLetter,
  useSaveJobSearchDraft,
  useSiteListView,
} from "@/ui/data"
import { useAutoSaveForm } from "@/ui/hooks"
import { useDraftWizardLifecycle } from "@/ui/pages/applicant/hooks"
import { WizardCancelChoicesModal, WizardModalShell } from "."
import { JobSearchCoverLetterView, JobSearchSearchConfigView } from "@/ui/views"
import type {
  JobSearchConfigSection,
  JobSearchEditorConfigValue,
} from "@/ui/views"

export function JobSearchWizardModal({
  open,
  applicantId,
  initialSnapshot,
  onClose,
  onFinished,
}: JobSearchWizardModalProperties) {
  const [step, setStep] = useState<WizardStep>("parameters")
  const siteList = useSiteListView()
  const saveDraft = useSaveJobSearchDraft(applicantId)
  const deleteDraft = useDeleteJobSearchDraft(applicantId)
  const finalizeDraft = useFinalizeJobSearchDraft(applicantId)
  const generateDraftCoverLetter = useGenerateDraftCoverLetter(applicantId)
  const { hasLlmKey } = useApiKeyStatus()

  const { setValue, watch } = useAutoSaveForm<
    WizardFormValues,
    JobSearchEditorSnapshot
  >({
    queryResult: { data: initialSnapshot, isLoading: false },
    toFormValues: (snapshot) => mapSnapshotToFormValues(snapshot),
    onSave: async (formValues) => {
      await saveDraft.mutateAsync(mapFormValuesToSnapshot(formValues))
    },
    shouldFlushOnUnmount: () => lifecycle.shouldFlushOnUnmount(),
    formOptions: { defaultValues: mapSnapshotToFormValues(initialSnapshot) },
  })

  const currentSnapshot = mapFormValuesToSnapshot(watch())
  const lifecycle = useDraftWizardLifecycle({
    snapshot: currentSnapshot,
    isMeaningful: isMeaningfulJobSearchEditorSnapshot,
    saveDraft: createSaveJobSearchDraft(saveDraft),
    deleteDraft: createDeleteJobSearchDraft(deleteDraft),
    finalizeDraft: createFinalizeJobSearchDraft(finalizeDraft),
    onClose,
    onFinished: ({ id }) => onFinished(id),
  })

  return (
    <>
      <WizardModalShell
        open={open}
        onClose={lifecycle.cancelWizard}
        title="Neue Jobsuche erstellen"
        stepLabel={
          step === "cover-letter"
            ? "Schritt 5 von 5: Anschreiben"
            : `Schritt ${resolveConfigStepIndex(step)} von 5: Suchkonfiguration`
        }
        maxWidthClassName="max-w-4xl"
        onBack={
          step === "parameters"
            ? undefined
            : () => setStep(previousWizardStep(step))
        }
        onNext={
          step === "cover-letter"
            ? undefined
            : () => setStep(nextWizardStep(step))
        }
        onFinish={step === "cover-letter" ? lifecycle.finishWizard : undefined}
      >
        {step === "cover-letter" ? (
          <JobSearchCoverLetterView
            value={{ content: watch("coverLetterContent") }}
            onUpdate={(value) => {
              setValue("coverLetterContent", value.content, {
                shouldDirty: true,
              })
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
        ) : (
          <JobSearchSearchConfigView
            sections={[step]}
            allSites={siteList.data.sites}
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
        )}
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

interface JobSearchWizardModalProperties {
  open: boolean
  applicantId: string
  initialSnapshot: JobSearchEditorSnapshot
  onClose: () => void
  onFinished: (jobSearchId: string) => void
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

type WizardStep = JobSearchConfigSection | "cover-letter"

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

function resolveConfigStepIndex(step: JobSearchConfigSection): number {
  return CONFIG_STEPS.indexOf(step) + 1
}

function nextWizardStep(step: WizardStep): WizardStep {
  const currentIndex = WIZARD_STEPS.indexOf(step)
  const nextIndex = Math.min(currentIndex + 1, WIZARD_STEPS.length - 1)
  return WIZARD_STEPS[nextIndex]
}

function previousWizardStep(step: WizardStep): WizardStep {
  const currentIndex = WIZARD_STEPS.indexOf(step)
  const previousIndex = Math.max(currentIndex - 1, 0)
  return WIZARD_STEPS[previousIndex]
}

const CONFIG_STEPS: JobSearchConfigSection[] = [
  "parameters",
  "mode",
  "sources",
  "preferences",
]

const WIZARD_STEPS: WizardStep[] = [...CONFIG_STEPS, "cover-letter"]

function applyWizardConfigValue(
  setValue: UseFormSetValue<WizardFormValues>,
  value: JobSearchEditorConfigValue,
): void {
  setValue("searchTerm", value.searchTerm, {
    shouldDirty: true,
  })
  setValue("radiusKm", value.radiusKm, { shouldDirty: true })
  setValue("searchMode", value.searchMode, {
    shouldDirty: true,
  })
  setValue("sources", value.sources, { shouldDirty: true })
  setValue("maxResults", value.maxResults, {
    shouldDirty: true,
  })
  setValue("maxDistanceKm", value.maxDistanceKm, {
    shouldDirty: true,
  })
  setValue("maxCommuteMinutes", value.maxCommuteMinutes, {
    shouldDirty: true,
  })
  setValue("freeText", value.freeText, { shouldDirty: true })
}

function createSaveJobSearchDraft(
  saveDraft: ReturnType<typeof useSaveJobSearchDraft>,
) {
  return async (snapshot: JobSearchEditorSnapshot) =>
    saveDraft.mutateAsync(snapshot)
}

function createDeleteJobSearchDraft(
  deleteDraft: ReturnType<typeof useDeleteJobSearchDraft>,
) {
  return async () => deleteDraft.mutateAsync()
}

function createFinalizeJobSearchDraft(
  finalizeDraft: ReturnType<typeof useFinalizeJobSearchDraft>,
) {
  return async () => finalizeDraft.mutateAsync()
}
