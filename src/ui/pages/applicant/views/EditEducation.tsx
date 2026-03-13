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

export default function ApplicantEditEducation() {
  const { register, control, isLoading, saveStatus } = useApplicantForm();
  const education = useFieldArray({ control, name: "education" });

  useAutoSaveHeader(saveStatus);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader title="Ausbildung" />

      {education.fields.map((field, i) => (
        <FieldArrayCard key={field.id} onRemove={() => education.remove(i)}>
          <FieldGrid>
            <Input
              label="Institution"
              {...register(`education.${i}.institution`)}
            />
            <Input label="Studiengang" {...register(`education.${i}.course`)} />
            <Input label="Von" {...register(`education.${i}.startDate`)} />
            <div className="relative">
              <Input label="Bis" {...register(`education.${i}.endDate`)} />
              <div className="absolute left-0 top-full z-10">
                <Checkbox
                  label="Daten offenlegen"
                  {...register(`education.${i}.discloseDates`)}
                />
              </div>
            </div>
            <Input label="Ort" {...register(`education.${i}.location`)} />
          </FieldGrid>
          <AutoExpandTextarea
            label="Highlights (eine pro Zeile)"
            {...register(`education.${i}.highlights`)}
          />
        </FieldArrayCard>
      ))}
      <AddButton
        onClick={() => education.append({ institution: "", course: "" })}
      >
        Ausbildung hinzufügen
      </AddButton>
    </div>
  );
}
