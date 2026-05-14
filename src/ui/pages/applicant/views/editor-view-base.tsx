import type { UseFormRegister, UseFormReturn } from "react-hook-form"
import { Input } from "@/ui/components"
import { AutoExpandTextarea, Checkbox } from "@/ui/pages/applicant/components"
import type { AutoSaveStatus } from "@/ui/hooks"
import type { ApplicantFormValues } from "./editor-form"

export function DateLocationHighlightsFields({
  fieldArrayName,
  index,
  register,
}: {
  fieldArrayName: DateFieldArray
  index: number
  register: UseFormRegister<ApplicantFormValues>
}) {
  return (
    <>
      <Input
        label="Von"
        {...register(`${fieldArrayName}.${index}.startDate`)}
      />
      <div className="relative">
        <Input
          label="Bis"
          {...register(`${fieldArrayName}.${index}.endDate`)}
        />
        <div className="absolute left-0 top-full z-10">
          <Checkbox
            label="Daten offenlegen"
            {...register(`${fieldArrayName}.${index}.discloseDates`)}
          />
        </div>
      </div>
      <Input label="Ort" {...register(`${fieldArrayName}.${index}.location`)} />
      <AutoExpandTextarea
        label="Highlights (eine pro Zeile)"
        {...register(`${fieldArrayName}.${index}.highlights`)}
      />
    </>
  )
}

/** Field array names that have date/location/highlights fields. */
type DateFieldArray = "education" | "experience"

export interface EditorViewProperties {
  form: UseFormReturn<ApplicantFormValues>
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}
