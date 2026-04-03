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

export default function ApplicantEditExperience() {
  const { register, control, isLoading, saveStatus } = useApplicantForm()
  const experience = useFieldArray({ control, name: "experience" })

  return (
    <ApplicantFormPage
      title="Berufserfahrung"
      isLoading={isLoading}
      saveStatus={saveStatus}
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
