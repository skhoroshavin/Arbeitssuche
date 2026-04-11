import { useRef, useState } from "react"
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"
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
import { JobSearchCoverLetterView, JobSearchSearchConfigView } from "@/ui/views"
import type { JobSearchConfigSection } from "@/ui/views"

export function JobSearchWizardModal({
  open,
  applicantId,
  initialSnapshot,
  onClose,
  onFinished,
}: JobSearchWizardModalProperties) {
  const [step, setStep] = useState<WizardStep>("parameters")
  const [showCancelChoices, setShowCancelChoices] = useState(false)
  const skipFlushOnUnmount = useRef(false)
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
    shouldFlushOnUnmount: () => !skipFlushOnUnmount.current,
    formOptions: { defaultValues: mapSnapshotToFormValues(initialSnapshot) },
  })

  const currentSnapshot = mapFormValuesToSnapshot(watch())
  const meaningful = isMeaningfulJobSearchEditorSnapshot(currentSnapshot)

  const cancelWizard = async () => {
    if (!meaningful) {
      skipFlushOnUnmount.current = true
      await deleteDraft.mutateAsync()
      onClose()
      return
    }
    setShowCancelChoices(true)
  }

  const finishWizard = async () => {
    await saveDraft.mutateAsync(currentSnapshot)
    const result = await finalizeDraft.mutateAsync()
    onFinished(result.id)
  }

  return (
    <>
      <Dialog open={open} onClose={cancelWizard} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/50" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Neue Jobsuche erstellen
              </DialogTitle>
              <button
                type="button"
                onClick={() => {
                  void cancelWizard()
                }}
                className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Schliessen
              </button>
            </div>

            {step === "cover-letter" ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">
                  Schritt 5 von 5: Anschreiben
                </h3>
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
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-300">
                  Schritt {resolveConfigStepIndex(step)} von 5:
                  Suchkonfiguration
                </h3>
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
                  onUpdate={(value) => {
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
                  }}
                />
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              {step !== "parameters" && (
                <button
                  type="button"
                  onClick={() => setStep(previousWizardStep(step))}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Zurueck
                </button>
              )}
              {step !== "cover-letter" && (
                <button
                  type="button"
                  onClick={() => setStep(nextWizardStep(step))}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Weiter
                </button>
              )}
              {step === "cover-letter" && (
                <button
                  type="button"
                  onClick={() => {
                    void finishWizard()
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                  Fertigstellen
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  void cancelWizard()
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Abbrechen
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <WizardCancelChoicesModal
        open={showCancelChoices}
        onContinue={() => setShowCancelChoices(false)}
        onKeepDraft={() => {
          void saveDraft.mutateAsync(currentSnapshot).then(() => {
            setShowCancelChoices(false)
            onClose()
          })
        }}
        onDiscard={() => {
          skipFlushOnUnmount.current = true
          void deleteDraft.mutateAsync().then(() => {
            setShowCancelChoices(false)
            onClose()
          })
        }}
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

function WizardCancelChoicesModal({
  open,
  onContinue,
  onKeepDraft,
  onDiscard,
}: WizardCancelChoicesModalProperties) {
  return (
    <Dialog open={open} onClose={onContinue} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Wizard verlassen?
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Sie können weiter bearbeiten, den Entwurf behalten oder den Entwurf
            verwerfen.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onContinue}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Weiter bearbeiten
            </button>
            <button
              type="button"
              onClick={onKeepDraft}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Entwurf behalten
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Entwurf verwerfen
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

interface WizardCancelChoicesModalProperties {
  open: boolean
  onContinue: () => void
  onKeepDraft: () => void
  onDiscard: () => void
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
