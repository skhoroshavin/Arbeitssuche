import { useFieldArray } from "react-hook-form";
import { useApplicantForm } from "@/ui/pages/applicant/hooks/applicant-form";
import { PageHeader, Input, Loading } from "@/ui/components";
import { AutoExpandTextarea } from "@/ui/pages/applicant/components/AutoExpandTextarea";
import { Checkbox } from "@/ui/pages/applicant/components/Checkbox";
import {
  AddButton,
  FieldArrayCard,
  FieldGrid,
} from "@/ui/pages/applicant/components/FormSection";
import { useAutoSaveHeader } from "@/ui/layout";

export default function ApplicantEditExperience() {
  const { register, control, isLoading, saveStatus } = useApplicantForm();
  const experience = useFieldArray({ control, name: "experience" });

  useAutoSaveHeader(saveStatus);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader title="Berufserfahrung" />

      {experience.fields.map((field, i) => (
        <FieldArrayCard key={field.id} onRemove={() => experience.remove(i)}>
          <FieldGrid>
            <Input label="Position" {...register(`experience.${i}.role`)} />
            <Input
              label="Unternehmen"
              {...register(`experience.${i}.company`)}
            />
            <Input label="Von" {...register(`experience.${i}.startDate`)} />
            <div className="relative">
              <Input label="Bis" {...register(`experience.${i}.endDate`)} />
              <div className="absolute left-0 top-full z-10">
                <Checkbox
                  label="Daten offenlegen"
                  {...register(`experience.${i}.discloseDates`)}
                />
              </div>
            </div>
            <Input label="Ort" {...register(`experience.${i}.location`)} />
          </FieldGrid>
          <AutoExpandTextarea
            label="Highlights (eine pro Zeile)"
            {...register(`experience.${i}.highlights`)}
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
    </div>
  );
}
