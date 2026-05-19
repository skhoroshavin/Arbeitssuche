import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { Input } from "@/ui/components"
import {
  AddButton,
  ApplicantFormPage,
  Checkbox,
  FieldArrayCard,
  FieldGrid,
} from "@/ui/pages/applicant/components"
import type { AutoSaveStatus } from "@/ui/hooks"
import type { ApplicantFormValues } from "./editor-form"

export function ApplicantEditorCertificationsView({
  form,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
}: ApplicantEditorCertificationsViewProperties) {
  const { register, control } = form
  const certifications = useFieldArray({ control, name: "certifications" })

  return (
    <ApplicantFormPage
      title="Zertifikate"
      isLoading={isLoading}
      saveStatus={saveStatus}
      useHeaderAutoSave={useHeaderAutoSave}
    >
      {certifications.fields.map((field, index) => (
        <FieldArrayCard
          key={field.id}
          onRemove={() => certifications.remove(index)}
          footer={
            <Checkbox
              label="Datum offenlegen"
              {...register(`certifications.${index}.discloseDates`)}
            />
          }
        >
          <FieldGrid>
            <Input label="Name" {...register(`certifications.${index}.name`)} />
            <Input
              label="Aussteller"
              {...register(`certifications.${index}.issuer`)}
            />
            <Input
              label="Datum"
              {...register(`certifications.${index}.date`)}
            />
            <Input
              label="Beschreibung"
              {...register(`certifications.${index}.description`)}
            />
          </FieldGrid>
        </FieldArrayCard>
      ))}
      <AddButton
        onClick={() =>
          certifications.append({
            name: "",
            issuer: "",
            date: "",
            discloseDates: false,
            description: "",
          })
        }
      >
        Zertifikat hinzufügen
      </AddButton>
    </ApplicantFormPage>
  )
}

interface ApplicantEditorCertificationsViewProperties {
  form: UseFormReturn<ApplicantFormValues>
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}
