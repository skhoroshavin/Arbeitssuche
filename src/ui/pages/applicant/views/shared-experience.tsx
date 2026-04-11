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

export function ApplicantEditorExperienceView({
  form,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
}: ApplicantEditorExperienceViewProperties) {
  const { register, control } = form
  const experience = useFieldArray({ control, name: "experience" })

  return (
    <ApplicantFormPage
      title="Berufserfahrung"
      isLoading={isLoading}
      saveStatus={saveStatus}
      useHeaderAutoSave={useHeaderAutoSave}
    >
      {experience.fields.map((field, index) => (
        <FieldArrayCard
          key={field.id}
          onRemove={() => experience.remove(index)}
        >
          <FieldGrid>
            <Input label="Position" {...register(`experience.${index}.role`)} />
            <Input
              label="Unternehmen"
              {...register(`experience.${index}.company`)}
            />
            <Input label="Von" {...register(`experience.${index}.startDate`)} />
            <div className="relative">
              <Input label="Bis" {...register(`experience.${index}.endDate`)} />
              <div className="absolute left-0 top-full z-10">
                <Checkbox
                  label="Daten offenlegen"
                  {...register(`experience.${index}.discloseDates`)}
                />
              </div>
            </div>
            <Input label="Ort" {...register(`experience.${index}.location`)} />
          </FieldGrid>
          <AutoExpandTextarea
            label="Highlights (eine pro Zeile)"
            {...register(`experience.${index}.highlights`)}
          />
        </FieldArrayCard>
      ))}
      <AddButton
        onClick={() =>
          experience.append({
            role: "",
            company: "",
            startDate: "",
            endDate: "",
          })
        }
      >
        Erfahrung hinzufügen
      </AddButton>
    </ApplicantFormPage>
  )
}

interface ApplicantEditorExperienceViewProperties {
  form: UseFormReturn<ApplicantFormValues>
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}
