import { useEffect, useState } from "react"

import { useNavigate, useParams } from "react-router"

import type { UseFormSetValue, UseFormWatch } from "react-hook-form"

import {
  createDefaultJobSearchEditorSnapshot,
  isMeaningfulJobSearchEditorSnapshot,
} from "@/models/job-search"

import type { JobSearch } from "@/models/job-search"

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

import { DraftWizardPage, useFirstStartWizardContext } from "@/ui/layout"
import { WizardCancelChoicesModal } from "@/ui/components"

import { JobSearchCoverLetterView, JobSearchSearchConfigView } from "@/ui/views"

import type {
  JobSearchConfigSection,
  JobSearchEditorConfigValue,
} from "@/ui/views"

import { SearchSource } from "@/models/job-search"
import { splitLines } from "@/ui/views"

export default function JobSearchWizardPage({
  initialStep,
  onStepChange,
}: JobSearchWizardPageProperties = {}) {
  const { applicantId = "" } = useParams<{ applicantId: string }>()
  const navigate = useNavigate()
  const firstStart = useFirstStartWizardContext()
  const [phase, setPhase] = useState<Phase>("loading")
  const [step, setStep] = useState<WizardStep_>(initialStep ?? "parameters")
  const [resolvedSnapshot, setResolvedSnapshot] = useState<
    JobSearch | undefined
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
    skipResumePrompt: firstStart.skipDraftResume,
  })

  useEffect(() => {
    if (initialStep) {
      setStep(initialStep)
    }
  }, [initialStep])

  const isEditing = phase === "editing"

  const { setValue, watch } = useAutoSaveForm<WizardFormValues, JobSearch>({
    queryResult: {
      data: isEditing ? resolvedSnapshot : undefined,
      isLoading: !isEditing,
    },
    toFormValues: mapJobSearchToFormValues,
    onSave: async (formValues) => {
      await saveDraft.mutateAsync(mapFormValuesToJobSearch(formValues))
    },
    shouldFlushOnUnmount: () => lifecycle.shouldFlushOnUnmount(),
    formOptions: {
      defaultValues: mapJobSearchToFormValues(
        createDefaultJobSearchEditorSnapshot(),
      ),
    },
  })

  const currentSnapshot = mapFormValuesToJobSearch(watch())
  const lifecycle = useDraftWizardLifecycle({
    snapshot: currentSnapshot,
    isMeaningful: isMeaningfulJobSearchEditorSnapshot,
    ...createDraftWizardMutations({ saveDraft, deleteDraft, finalizeDraft }),
    onClose: () => {
      void navigate(`/applicants/${applicantId}`)
    },
    onFinished: ({ id }) => {
      if (firstStart.isInFirstStart) {
        firstStart.onPhaseComplete({ jobSearchId: id })
        return
      }

      void navigate(`/job-searches/${id}/vacancies`, {
        state: { startInitialUpdate: true },
      })
    },
  })

  function handleStepChange(nextStep: WizardStep_) {
    setStep(nextStep)
    onStepChange?.(nextStep, currentSnapshot)
  }

  return (
    <>
      <DraftWizardPage
        phase={phase}
        title="Neue Jobsuche erstellen"
        steps={
          [
            "parameters",
            "mode",
            "sources",
            "preferences",
            "cover-letter",
          ] as const
        }
        currentStep={step}
        stepLabels={STEP_LABELS}
        setStep={handleStepChange}
        onCancel={() => {
          void lifecycle.cancelWizard()
        }}
        onFinish={lifecycle.finishWizard}
        resumePrompt={{
          description:
            "Es gibt eine fortsetzbare Jobsuche im Entwurf. Möchten Sie fortsetzen oder neu starten?",
          discardLabel: "Entwurf verwerfen",
          onResume: () => setPhase("editing"),
          onDiscardAndStartFresh: async () => {
            await deleteDraft.mutateAsync()
            setResolvedSnapshot(createDefaultJobSearchEditorSnapshot())
            setPhase("editing")
          },
        }}
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

interface JobSearchWizardPageProperties {
  initialStep?: WizardStep_
  onStepChange?: (step: WizardStep_, snapshot: JobSearch) => void
}

type Phase = "loading" | "resume-prompt" | "editing"

const STEP_LABELS: Record<WizardStep_, string> = {
  parameters: "Parameter",
  mode: "Modus",
  sources: "Quellen",
  preferences: "Einstellungen",
  "cover-letter": "Anschreiben",
}

function mapJobSearchToFormValues(jobSearch: JobSearch): WizardFormValues {
  return {
    searchTerm: jobSearch.searchTerm,
    radiusKm: jobSearch.radiusKm,
    searchMode: jobSearch.mode,
    sources: jobSearch.sources.map((s: { value: string }) => s.value),
    maxResults:
      jobSearch.maxResultsPerSource === 0
        ? undefined
        : jobSearch.maxResultsPerSource,
    maxCommuteMinutes:
      jobSearch.maxCommuteMinutes === 0
        ? undefined
        : jobSearch.maxCommuteMinutes,
    freeText: splitLines(jobSearch.notes),
    coverLetterContent: jobSearch.coverLetter,
  }
}

function mapFormValuesToJobSearch(values: WizardFormValues): JobSearch {
  return {
    searchTerm: values.searchTerm,
    radiusKm: values.radiusKm,
    mode: values.searchMode,
    sources: values.sources.map((s) => SearchSource(s)),
    maxResultsPerSource: values.maxResults ?? 0,
    maxCommuteMinutes: values.maxCommuteMinutes ?? 0,
    notes: values.freeText.join("\n"),
    coverLetter: values.coverLetterContent,
  }
}

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
      value={readConfigValue(watch)}
      onUpdate={(value) => applyWizardConfigValue(setValue, value)}
    />
  )
}

interface JobSearchWizardStepViewProperties {
  step: WizardStep_
  watch: UseFormWatch<WizardFormValues>
  setValue: UseFormSetValue<WizardFormValues>
  saveDraft: {
    mutateAsync: (snapshot: JobSearch) => Promise<unknown>
  }
  currentSnapshot: JobSearch
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
  const nextValues = mapConfigValueToFormValues(configUpdate)

  setValue("searchTerm", nextValues.searchTerm, { shouldDirty: true })
  setValue("radiusKm", nextValues.radiusKm, { shouldDirty: true })
  setValue("searchMode", nextValues.searchMode, { shouldDirty: true })
  setValue("sources", nextValues.sources, { shouldDirty: true })
  setValue("maxResults", nextValues.maxResults, { shouldDirty: true })
  setValue("maxCommuteMinutes", nextValues.maxCommuteMinutes, {
    shouldDirty: true,
  })
  setValue("freeText", nextValues.freeText, { shouldDirty: true })
}

function mapConfigValueToFormValues(
  value: JobSearchEditorConfigValue,
): Pick<
  WizardFormValues,
  | "searchTerm"
  | "radiusKm"
  | "searchMode"
  | "sources"
  | "maxResults"
  | "maxCommuteMinutes"
  | "freeText"
> {
  return {
    searchTerm: value.searchTerm,
    radiusKm: value.radiusKm,
    searchMode: value.searchMode,
    sources: value.sources,
    maxResults: stringifyOptionalNumber(value.maxResults),
    maxCommuteMinutes: stringifyOptionalNumber(value.maxCommuteMinutes),
    freeText: value.freeText,
  }
}

function readConfigValue(
  watch: UseFormWatch<WizardFormValues>,
): JobSearchEditorConfigValue {
  return {
    searchTerm: watch("searchTerm"),
    radiusKm: watch("radiusKm"),
    searchMode: watch("searchMode"),
    sources: watch("sources"),
    maxResults: watch("maxResults"),
    maxCommuteMinutes: watch("maxCommuteMinutes"),
    freeText: watch("freeText"),
  }
}

function stringifyOptionalNumber(value: number | undefined): string {
  return value === undefined ? "" : value.toString()
}

interface WizardFormValues {
  searchTerm: string
  radiusKm: number
  searchMode: "employment" | "entry-level" | "apprenticeship"
  sources: string[]
  maxResults?: number
  maxCommuteMinutes?: number
  freeText: string[]
  coverLetterContent: string
}
