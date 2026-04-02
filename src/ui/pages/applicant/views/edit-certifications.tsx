import { useFieldArray } from "react-hook-form";
import { useApplicantForm } from "@/ui/pages/applicant/hooks";
import { Input } from "@/ui/components";
import { Checkbox } from "@/ui/pages/applicant/components";
import { ApplicantFormPage } from "@/ui/pages/applicant/components";
import {
  AddButton,
  FieldArrayCard,
  FieldGrid,
} from "@/ui/pages/applicant/components";

export default function ApplicantEditCertifications() {
  const { register, control, isLoading, saveStatus } = useApplicantForm();
  const certifications = useFieldArray({ control, name: "certifications" });

  return (
    <ApplicantFormPage
      title="Zertifikate"
      isLoading={isLoading}
      saveStatus={saveStatus}
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
      <AddButton onClick={() => certifications.append({ name: "" })}>
        Zertifikat hinzufügen
      </AddButton>
    </ApplicantFormPage>
  );
}
