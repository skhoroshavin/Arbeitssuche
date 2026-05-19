import { useFieldArray } from "react-hook-form"
import { Input } from "@/ui/components"
import {
  AddButton,
  ApplicantFormPage,
  FieldArrayCard,
  FieldGrid,
} from "@/ui/pages/applicant/components"
import {
  DateLocationHighlightsFields,
  type EditorViewProperties,
} from "./editor-view-base"

export function ApplicantEditorExperienceView({
  form,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
}: EditorViewProperties) {
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
            <DateLocationHighlightsFields
              fieldArrayName="experience"
              index={index}
              register={register}
            />
          </FieldGrid>
        </FieldArrayCard>
      ))}
      <AddButton
        onClick={() =>
          experience.append({
            role: "",
            company: "",
            startDate: "",
            endDate: "",
            location: "",
            discloseDates: false,
          })
        }
      >
        Erfahrung hinzufügen
      </AddButton>
    </ApplicantFormPage>
  )
}
