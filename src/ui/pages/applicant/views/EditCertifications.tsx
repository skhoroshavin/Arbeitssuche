import { useFieldArray } from "react-hook-form";
import { useApplicantForm } from "@/ui/pages/applicant/hooks/applicant-form";
import { PageHeader, Input, Loading } from "@/ui/components";
import { Checkbox } from "@/ui/pages/applicant/components/Checkbox";
import {
  AddButton,
  FieldArrayCard,
  FieldGrid,
} from "@/ui/pages/applicant/components/FormSection";
import { useAutoSaveHeader } from "@/ui/layout";

export default function ApplicantEditCertifications() {
  const { register, control, isLoading, saveStatus } = useApplicantForm();
  const certifications = useFieldArray({ control, name: "certifications" });

  useAutoSaveHeader(saveStatus);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader title="Zertifikate" />

      {certifications.fields.map((field, i) => (
        <FieldArrayCard
          key={field.id}
          onRemove={() => certifications.remove(i)}
          footer={
            <Checkbox
              label="Datum offenlegen"
              {...register(`certifications.${i}.discloseDates`)}
            />
          }
        >
          <FieldGrid>
            <Input label="Name" {...register(`certifications.${i}.name`)} />
            <Input
              label="Aussteller"
              {...register(`certifications.${i}.issuer`)}
            />
            <Input label="Datum" {...register(`certifications.${i}.date`)} />
            <Input
              label="Beschreibung"
              {...register(`certifications.${i}.description`)}
            />
          </FieldGrid>
        </FieldArrayCard>
      ))}
      <AddButton onClick={() => certifications.append({ name: "" })}>
        Zertifikat hinzufügen
      </AddButton>
    </div>
  );
}
