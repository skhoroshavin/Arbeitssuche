import { useFieldArray } from "react-hook-form";
import { useApplicantForm } from "@/ui/pages/applicant/hooks/applicant-form";
import { PageHeader, Input, Textarea, Loading } from "@/ui/components";
import { Checkbox } from "@/ui/pages/applicant/components/Checkbox";
import {
  Section,
  AddButton,
  RemoveButton,
} from "@/ui/pages/applicant/components/FormSection";
import { useAutoSaveHeader } from "@/ui/layout";

export default function ApplicantEditOther() {
  const { register, control, isLoading, saveStatus } = useApplicantForm();
  const skills = useFieldArray({ control, name: "skills" });
  const languages = useFieldArray({ control, name: "languages" });

  useAutoSaveHeader(saveStatus);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader title="Sonstiges" />

      <Section title="Kenntnisse">
        {skills.fields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-end">
            <Input label="Kenntnis" {...register(`skills.${i}.name`)} />
            <RemoveButton onClick={() => skills.remove(i)} />
          </div>
        ))}
        <AddButton onClick={() => skills.append({ name: "" })}>
          Kenntnis hinzufügen
        </AddButton>
      </Section>

      <Section title="Sprachen">
        {languages.fields.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-end">
            <Input label="Sprache" {...register(`languages.${i}.language`)} />
            <Input label="Niveau" {...register(`languages.${i}.level`)} />
            <RemoveButton onClick={() => languages.remove(i)} />
          </div>
        ))}
        <AddButton
          onClick={() => languages.append({ language: "", level: "" })}
        >
          Sprache hinzufügen
        </AddButton>
      </Section>

      <Section title="Hobbys">
        <Textarea
          label="Hobbys (kommagetrennt)"
          rows={2}
          {...register("personal.hobbies")}
        />
        <Checkbox {...register("disclose.hobbies")} />
      </Section>

      <Section title="Persönliche Notizen">
        <Textarea
          label="Notizen (eine pro Zeile)"
          rows={5}
          {...register("personalNotes")}
        />
        <p className="text-xs text-gray-400">
          Wird nie im Lebenslauf angezeigt.
        </p>
      </Section>
    </div>
  );
}
