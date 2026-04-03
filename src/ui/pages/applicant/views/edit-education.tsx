import { useFieldArray } from "react-hook-form"
import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { Input } from "@/ui/components"
import { AutoExpandTextarea } from "@/ui/pages/applicant/components"
import { Checkbox } from "@/ui/pages/applicant/components"
import { ApplicantFormPage } from "@/ui/pages/applicant/components"
import {
  AddButton,
  FieldArrayCard,
  FieldGrid,
} from "@/ui/pages/applicant/components"

export default function ApplicantEditEducation() {
  const { register, control, isLoading, saveStatus } = useApplicantForm()
  const education = useFieldArray({ control, name: "education" })

  return (
    <ApplicantFormPage
      title="Ausbildung"
      isLoading={isLoading}
      saveStatus={saveStatus}
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
