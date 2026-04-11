import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { ApplicantEditorExperienceView } from "./shared-experience"

export default function ApplicantEditExperience() {
  const form = useApplicantForm()
  return (
    <ApplicantEditorExperienceView
      form={form}
      isLoading={form.isLoading}
      saveStatus={form.saveStatus}
    />
  )
}
