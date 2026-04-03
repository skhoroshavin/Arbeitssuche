import { useFieldArray } from "react-hook-form"
import { useApplicantForm } from "@/ui/pages/applicant/hooks"
import { Input, Textarea } from "@/ui/components"
import { Checkbox } from "@/ui/pages/applicant/components"
import { ApplicantFormPage } from "@/ui/pages/applicant/components"
import {
  Section,
  AddButton,
  RemoveButton,
} from "@/ui/pages/applicant/components"

export default function ApplicantEditOther() {
  const { register, control, isLoading, saveStatus } = useApplicantForm()
  const skills = useFieldArray({ control, name: "skills" })
  const languages = useFieldArray({ control, name: "languages" })

  return (
    <ApplicantFormPage
      title="Sonstiges"
      isLoading={isLoading}
      saveStatus={saveStatus}
    >
      <Section title="Kenntnisse">
        {skills.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end">
            <Input label="Kenntnis" {...register(`skills.${index}.name`)} />
            <RemoveButton onClick={() => skills.remove(index)} />
          </div>
        ))}
        <AddButton onClick={() => skills.append({ name: "" })}>
          Kenntnis hinzufügen
        </AddButton>
      </Section>

      <Section title="Sprachen">
        {languages.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end">
            <Input
              label="Sprache"
              {...register(`languages.${index}.language`)}
            />
            <Input label="Niveau" {...register(`languages.${index}.level`)} />
            <RemoveButton onClick={() => languages.remove(index)} />
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
    </ApplicantFormPage>
  )
}
