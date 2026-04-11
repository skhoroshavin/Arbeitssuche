import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { ApplicantEditorPersonalView } from "./shared-personal"

export default function ApplicantEditPersonal() {
  const form = useApplicantForm()
  return <ApplicantEditorPersonalView form={form} {...form} />
}
