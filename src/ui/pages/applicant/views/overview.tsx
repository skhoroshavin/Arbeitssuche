import { useState } from "react"
import { useParams, useNavigate, useLocation, Link } from "react-router"
import { createDefaultJobSearchEditorSnapshot } from "@/models/job-search"
import type { JobSearchEditorSnapshot } from "@/models/job-search/types"
import {
  useApplicantHeaderName,
  useApplicant,
  useDownloadResume,
  useConsultSearchesView,
  useApiKeyStatus,
  useJobSearchListView,
  useCreateJobSearch,
  useDeleteJobSearchDraft,
  useDeleteJobSearch,
  useJobSearchDraft,
} from "@/ui/data"
import { PageHeader, Loading } from "@/ui/components"
import { EntityList } from "@/ui/pages/applicant/components"
import { TemplateSelector } from "@/ui/pages/applicant/components"
import { ConsultationModal } from "@/ui/pages/applicant/components"
import { JobSearchResumeDraftModal } from "@/ui/pages/applicant/components"
import { JobSearchWizardModal } from "@/ui/pages/applicant/components"
import type { ConsultationSuggestion } from "@/models/job-search/types"
import {
  closeDraftPrompt,
  discardDraftAndOpen,
  resumeDraftSnapshot,
} from "@/ui/pages/applicant/hooks"

export default function ApplicantOverview() {
  const { id = "" } = useParams<{ id: string }>()
  const overview = useOverviewData(id)
  const deleteJobSearch = useDeleteJobSearch()
  const draftQuery = useJobSearchDraft(id)
  const deleteDraft = useDeleteJobSearchDraft(id)
  const navigate = useNavigate()
  const location = useLocation()
  const [showResumeDraftModal, setShowResumeDraftModal] = useState(false)
  const [wizardSnapshot, setWizardSnapshot] =
    useState<JobSearchEditorSnapshot>()

  const downloadResume = useDownloadResume(id, overview.displayName)
  const { hasLlmKey } = useApiKeyStatus()
  const consultation = useConsultationFlow(id)

  if (overview.isLoading) return <Loading />
  if (!overview.data) return <div>Bewerber nicht gefunden</div>

  return (
    <ApplicantOverviewContent
      applicantId={id}
      overview={overview}
      deleteJobSearch={deleteJobSearch}
      draftQuery={draftQuery}
      deleteDraft={deleteDraft}
      navigate={navigate}
      locationPathname={location.pathname}
      downloadResume={downloadResume}
      hasLlmKey={hasLlmKey}
      consultation={consultation}
      showResumeDraftModal={showResumeDraftModal}
      setShowResumeDraftModal={setShowResumeDraftModal}
      wizardSnapshot={wizardSnapshot}
      setWizardSnapshot={setWizardSnapshot}
    />
  )
}

function ApplicantOverviewContent({
  applicantId,
  overview,
  deleteJobSearch,
  draftQuery,
  deleteDraft,
  navigate,
  locationPathname,
  downloadResume,
  hasLlmKey,
  consultation,
  showResumeDraftModal,
  setShowResumeDraftModal,
  wizardSnapshot,
  setWizardSnapshot,
}: {
  applicantId: string
  overview: ReturnType<typeof useOverviewData>
  deleteJobSearch: ReturnType<typeof useDeleteJobSearch>
  draftQuery: ReturnType<typeof useJobSearchDraft>
  deleteDraft: ReturnType<typeof useDeleteJobSearchDraft>
  navigate: ReturnType<typeof useNavigate>
  locationPathname: string
  downloadResume: ReturnType<typeof useDownloadResume>
  hasLlmKey: boolean
  consultation: ReturnType<typeof useConsultationFlow>
  showResumeDraftModal: boolean
  setShowResumeDraftModal: (value: boolean) => void
  wizardSnapshot?: JobSearchEditorSnapshot
  setWizardSnapshot: (snapshot: JobSearchEditorSnapshot | undefined) => void
}) {
  const openFreshWizard = (searchTerm: string) => {
    const snapshot = createDefaultJobSearchEditorSnapshot()
    snapshot.params.searchTerm = searchTerm
    setWizardSnapshot(snapshot)
  }
  const closePrompt = closeDraftPrompt(setShowResumeDraftModal)

  return (
    <div className="space-y-4">
      <PageHeader title="Lebenslauf" />

      <TemplateSelector
        onSelect={(template) => downloadResume.mutate(template)}
        isPending={downloadResume.isPending}
      />

      <EntityList
        title="Jobsuchen"
        buttonLabel="Neue Suche"
        placeholder="Suchbegriff (z.B. React Entwickler)"
        emptyMessage="Noch keine Jobsuchen. Erstellen Sie eine, um loszulegen."
        items={overview.jobSearchItems}
        isLoading={overview.jobSearchesLoading}
        onCreateSubmit={async () => {}}
        onCreateClick={async () => {
          const result = await draftQuery.refetch()
          const draft = result.data?.draft
          if (draft?.meaningful) {
            setShowResumeDraftModal(true)
            return
          }
          openFreshWizard("")
        }}
        createError={undefined}
        onDelete={(item) => {
          if (confirm(`Jobsuche "${item.label}" löschen?`)) {
            deleteJobSearch.mutate(item.id)
          }
        }}
        onNavigate={(jobSearchId) =>
          navigate(`/job-searches/${jobSearchId}/vacancies`)
        }
        headerExtra={
          <ConsultationButton
            onConsult={consultation.handleConsult}
            isPending={consultation.consultSearches.isPending}
            hasLlmKey={hasLlmKey}
            returnTo={locationPathname}
          />
        }
      />

      <ConsultationModal
        open={consultation.showConsultation}
        suggestions={consultation.suggestions}
        isLoading={consultation.consultSearches.isPending}
        error={consultation.consultSearches.error ?? undefined}
        onClose={consultation.handleClose}
        onCreateSelected={consultation.handleCreateSelected}
        isCreating={consultation.isCreatingSuggestions}
      />

      <JobSearchResumeDraftModal
        open={showResumeDraftModal}
        onResume={() => {
          resumeDraftSnapshot({
            draft: draftQuery.data?.draft,
            openSnapshot: setWizardSnapshot,
            closePrompt,
          })
        }}
        onDiscardAndStartOver={() => {
          discardDraftAndOpen({
            deleteDraft: () => deleteDraft.mutateAsync(),
            openFresh: () => openFreshWizard(""),
            closePrompt,
          })
        }}
        onCancel={closePrompt}
      />

      {wizardSnapshot && (
        <JobSearchWizardModal
          open={true}
          applicantId={applicantId}
          initialSnapshot={wizardSnapshot}
          onClose={() => setWizardSnapshot(undefined)}
          onFinished={(jobSearchId) => {
            setWizardSnapshot(undefined)
            void navigate(`/job-searches/${jobSearchId}/vacancies`, {
              state: { startInitialUpdate: true },
            })
          }}
        />
      )}
    </div>
  )
}

function ConsultationButton({
  onConsult,
  isPending,
  hasLlmKey,
  returnTo,
}: {
  onConsult: () => void
  isPending: boolean
  hasLlmKey: boolean
  returnTo: string
}) {
  return (
    <div>
      <button
        onClick={onConsult}
        disabled={isPending || !hasLlmKey}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
      >
        Beratung
      </button>
      {!hasLlmKey && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          KI-Schlüssel erforderlich.{" "}
          <Link
            to="/settings"
            state={{ returnTo }}
            className="underline hover:no-underline"
          >
            Zu den Einstellungen
          </Link>
        </p>
      )}
    </div>
  )
}

function useConsultationFlow(id: string) {
  const consultSearches = useConsultSearchesView(id)
  const createJobSearch = useCreateJobSearch()
  const [showConsultation, setShowConsultation] = useState(false)
  const [isCreatingSuggestions, setIsCreatingSuggestions] = useState(false)
  const suggestions = consultSearches.suggestions

  const handleConsult = () => {
    setShowConsultation(true)
    consultSearches.mutate()
  }

  const handleCreateSelected = async (selected: ConsultationSuggestion[]) => {
    setIsCreatingSuggestions(true)
    try {
      await Promise.all(
        selected.map((suggestion) =>
          createJobSearch.mutateAsync({
            searchTerm: suggestion.searchTerm,
            applicantId: id,
            searchMode: suggestion.searchMode,
          }),
        ),
      )
      setShowConsultation(false)
      consultSearches.reset()
    } finally {
      setIsCreatingSuggestions(false)
    }
  }

  const handleClose = () => {
    setShowConsultation(false)
    consultSearches.reset()
  }

  return {
    showConsultation,
    isCreatingSuggestions,
    consultSearches,
    suggestions,
    handleConsult,
    handleCreateSelected,
    handleClose,
  }
}

function useOverviewData(id: string) {
  const { data, isLoading } = useApplicant(id)
  const { displayName } = useApplicantHeaderName(id)
  const jobSearches = useJobSearchListView(id)
  const jobSearchItems = jobSearches.data.jobSearches.map((js) => ({
    id: js.id,
    label: js.searchTerm || js.id,
  }))
  return {
    data,
    isLoading,
    displayName,
    jobSearchItems,
    jobSearchesLoading: jobSearches.isLoading,
  }
}
