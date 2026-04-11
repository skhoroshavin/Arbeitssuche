import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { Input } from "@/ui/components"
import {
  AddButton,
  ApplicantFormPage,
  AutoExpandTextarea,
  Checkbox,
  FieldArrayCard,
  FieldGrid,
} from "@/ui/pages/applicant/components"
import type { AutoSaveStatus } from "@/ui/hooks"
import type { ApplicantFormValues } from "./editor-form"

export function ApplicantEditorEducationView({
  form,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
}: ApplicantEditorEducationViewProperties) {
  const { register, control } = form
  const education = useFieldArray({ control, name: "education" })

  return (
    <ApplicantFormPage
      title="Ausbildung"
      isLoading={isLoading}
      saveStatus={saveStatus}
      useHeaderAutoSave={useHeaderAutoSave}
    >
      {education.fields.map((field, index) => (
        <FieldArrayCard key={field.id} onRemove={() => education.remove(index)}>
          <FieldGrid>
            <Input
              label="Institution"
              {...register(`education.${index}.institution`)}
            />
            <Input
              label="Studiengang"
              {...register(`education.${index}.course`)}
            />
            <Input label="Von" {...register(`education.${index}.startDate`)} />
            <div className="relative">
              <Input label="Bis" {...register(`education.${index}.endDate`)} />
              <div className="absolute left-0 top-full z-10">
                <Checkbox
                  label="Daten offenlegen"
                  {...register(`education.${index}.discloseDates`)}
                />
              </div>
            </div>
            <Input label="Ort" {...register(`education.${index}.location`)} />
          </FieldGrid>
          <AutoExpandTextarea
            label="Highlights (eine pro Zeile)"
            {...register(`education.${index}.highlights`)}
          />
        </FieldArrayCard>
      ))}
      <AddButton
        onClick={() => education.append({ institution: "", course: "" })}
      >
        Ausbildung hinzufügen
      </AddButton>
    </ApplicantFormPage>
  )
}

interface ApplicantEditorEducationViewProperties {
  form: UseFormReturn<ApplicantFormValues>
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}
