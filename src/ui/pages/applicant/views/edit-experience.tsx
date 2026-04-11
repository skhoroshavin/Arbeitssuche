import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { ApplicantEditorExperienceView } from "./shared-experience"

export default function ApplicantEditExperience() {
  const form = useApplicantForm()
  return <ApplicantEditorExperienceView form={form} {...form} />
}
