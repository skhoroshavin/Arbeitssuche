import { useState } from "react"
import { useNavigate } from "react-router"
import {
  useApplicantListView,
  useApplicantDraft,
  useDeleteApplicantDraft,
  useDeleteApplicant,
} from "@/ui/data"
import {
  EntityList,
  ApplicantResumeDraftModal,
} from "@/ui/pages/applicant/components"
import type { ApplicantDraftSnapshot } from "@/models/applicant/types"
import { useLayoutConfig } from "@/ui/layout"
import {
  closeDraftPrompt,
  discardDraftAndOpen,
  resumeDraftSnapshot,
} from "@/ui/pages/applicant/hooks"
import {
  ApplicantWizardModal,
  createFreshApplicantWizardSnapshot,
} from "./wizard-modal"

export default function ApplicantList() {
  const { data, isLoading } = useApplicantListView()
  const draftQuery = useApplicantDraft()
  const deleteDraft = useDeleteApplicantDraft()
  const remove = useDeleteApplicant()
  const navigate = useNavigate()
  const [showResumeDraftModal, setShowResumeDraftModal] = useState(false)
  const [wizardSnapshot, setWizardSnapshot] = useState<ApplicantDraftSnapshot>()
  const closePrompt = closeDraftPrompt(setShowResumeDraftModal)

  useLayoutConfig(
    () => ({
      sidebarTitle: "Startseite",
      sidebarNavItems: [],
      headerTitle: "Bewerber",
      headerBackLink: undefined,
    }),
    [],
  )

  const items = data.map((applicant) => ({
    id: applicant.id,
    label: applicant.name || applicant.id,
  }))

  const openFreshWizard = () => {
    setWizardSnapshot(createFreshApplicantWizardSnapshot())
  }

  return (
    <>
      <EntityList
        buttonLabel="Neuer Bewerber"
        placeholder="Name (z.B. Max Mustermann)"
        emptyMessage="Noch keine Bewerber. Erstellen Sie einen, um loszulegen."
        items={items}
        isLoading={isLoading}
        onCreateSubmit={async () => {}}
        onCreateClick={async () => {
          const result = await draftQuery.refetch()
          const draft = result.data?.draft
          if (draft?.meaningful) {
            setShowResumeDraftModal(true)
            return
          }
          openFreshWizard()
        }}
        createError={undefined}
        onDelete={(item) => {
          if (confirm(`Bewerber "${item.label}" löschen?`)) {
            remove.mutate(item.id)
          }
        }}
        onNavigate={(id) => navigate(`/applicants/${id}`)}
      />

      <ApplicantResumeDraftModal
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
            openFresh: openFreshWizard,
            closePrompt,
          })
        }}
        onCancel={closePrompt}
      />

      {wizardSnapshot && (
        <ApplicantWizardModal
          open={true}
          initialSnapshot={wizardSnapshot}
          onClose={() => setWizardSnapshot(undefined)}
          onFinished={(applicantId) => {
            setWizardSnapshot(undefined)
            void navigate(`/applicants/${applicantId}`)
          }}
        />
      )}
    </>
  )
}
