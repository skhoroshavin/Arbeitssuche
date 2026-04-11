import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { ApplicantEditorCertificationsView } from "./shared-certifications"

export default function ApplicantEditCertifications() {
  const form = useApplicantForm()
  return <ApplicantEditorCertificationsView form={form} {...form} />
}
