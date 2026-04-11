import { ResumeDraftModal } from "./resume-draft-modal"

export function ApplicantResumeDraftModal({
  open,
  onResume,
  onDiscardAndStartOver,
  onCancel,
}: ApplicantResumeDraftModalProperties) {
  return (
    <ResumeDraftModal
      open={open}
      description="Es gibt einen fortsetzbaren Bewerberentwurf. Möchten Sie fortsetzen oder neu starten?"
      discardLabel="Neu starten"
      onResume={onResume}
      onDiscardAndStartOver={onDiscardAndStartOver}
      onCancel={onCancel}
    />
  )
}

interface ApplicantResumeDraftModalProperties {
  open: boolean
  onResume: () => void
  onDiscardAndStartOver: () => void
  onCancel: () => void
}
