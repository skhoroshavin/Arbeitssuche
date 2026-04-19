import { useSaveSetupState, useSetupState } from "@/ui/data"
import ApplicantWizardPage from "./wizard"

export function FirstStartApplicantRoute() {
  const setupState = useSetupState()
  const saveSetup = useSaveSetupState()

  return (
    <ApplicantWizardPage
      initialStep={toApplicantStep(setupState.data?.state?.lastStep)}
      onStepChange={(step) => {
        void saveSetup.mutateAsync({
          completed: false,
          lastPhase: "applicant",
          lastStep: step,
        })
      }}
    />
  )
}

function toApplicantStep(step: string | undefined) {
  switch (step) {
    case "experience":
    case "education":
    case "certifications":
    case "other":
    case "personal": {
      return step
    }
    default: {
      return
    }
  }
}
