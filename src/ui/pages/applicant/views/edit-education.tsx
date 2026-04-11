import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { ApplicantEditorEducationView } from "./shared-education"

export default function ApplicantEditEducation() {
  const form = useApplicantForm()
  return (
    <ApplicantEditorEducationView
      form={form}
      isLoading={form.isLoading}
      saveStatus={form.saveStatus}
    />
  )
}
