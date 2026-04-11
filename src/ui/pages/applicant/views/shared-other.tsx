import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { Input, Textarea } from "@/ui/components"
import {
  AddButton,
  ApplicantFormPage,
  Checkbox,
  RemoveButton,
  Section,
} from "@/ui/pages/applicant/components"
import type { AutoSaveStatus } from "@/ui/hooks"
import type { ApplicantFormValues } from "./editor-form"

export function ApplicantEditorOtherView({
  form,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
}: ApplicantEditorOtherViewProperties) {
  const { register, control } = form
  const skills = useFieldArray({ control, name: "skills" })
  const languages = useFieldArray({ control, name: "languages" })

  return (
    <ApplicantFormPage
      title="Sonstiges"
      isLoading={isLoading}
      saveStatus={saveStatus}
      useHeaderAutoSave={useHeaderAutoSave}
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

interface ApplicantEditorOtherViewProperties {
  form: UseFormReturn<ApplicantFormValues>
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}
