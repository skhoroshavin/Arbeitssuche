import { Navigate, useParams } from "react-router"
import { useSaveSetupState, useSetupState } from "@/ui/data"
import JobSearchWizardPage from "./wizard"

export function FirstStartJobSearchRoute() {
  const { applicantId } = useParams<{ applicantId: string }>()
  const setupState = useSetupState()
  const state = setupState.data?.state
  const saveSetup = useSaveSetupState()

  if (!applicantId) {
    const storedApplicantId = state?.applicantId
    if (storedApplicantId) {
      return (
        <Navigate to={`/first-start/job-search/${storedApplicantId}`} replace />
      )
    }
    return <Navigate to="/first-start/applicant" replace />
  }

  return (
    <JobSearchWizardPage
      initialStep={toJobSearchStep(state?.lastStep)}
      onStepChange={(step) => {
        void saveSetup.mutateAsync({
          completed: false,
          lastPhase: "job-search",
          lastStep: step,
          applicantId,
        })
      }}
    />
  )
}

function toJobSearchStep(step: string | undefined) {
  switch (step) {
    case "mode":
    case "sources":
    case "preferences":
    case "cover-letter":
    case "parameters": {
      return step
    }
    default: {
      return
    }
  }
}
