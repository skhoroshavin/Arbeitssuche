import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { ApplicantEditorOtherView } from "./shared-other"

export default function ApplicantEditOther() {
  const form = useApplicantForm()
  return (
    <ApplicantEditorOtherView
      form={form}
      isLoading={form.isLoading}
      saveStatus={form.saveStatus}
    />
  )
}
