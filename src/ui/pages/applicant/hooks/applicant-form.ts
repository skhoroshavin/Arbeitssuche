import { useParams } from "react-router"
import { useApplicant, useUpdateApplicant } from "@/ui/data"
import { useAutoSaveForm } from "@/ui/hooks"
import type { Applicant } from "@/models/applicant"
import {
  fromApplicantFormValues,
  toApplicantFormValues,
  type ApplicantFormValues,
} from "@/ui/pages/applicant/views/editor-form"

export function useApplicantForm() {
  const { id = "" } = useParams<{ id: string }>()
  const { data, isLoading } = useApplicant(id)
  const update = useUpdateApplicant(id)

  return useAutoSaveForm<ApplicantFormValues, Applicant>({
    queryResult: { data, isLoading },
    toFormValues: toApplicantFormValues,
    onSave: async (formData) => {
      const parsed = fromApplicantFormValues(formData)
      await update.mutateAsync(parsed)
    },
  })
}
