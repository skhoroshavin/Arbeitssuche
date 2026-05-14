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

export function ApplicantEditorEducationView({
  form,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
}: EditorViewProperties) {
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
            <DateLocationHighlightsFields
              fieldArrayName="education"
              index={index}
              register={register}
            />
          </FieldGrid>
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
