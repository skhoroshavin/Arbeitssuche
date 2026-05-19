import type { UseFormReturn } from "react-hook-form"
import { Input } from "@/ui/components"
import {
  ApplicantFormPage,
  Checkbox,
  Section,
} from "@/ui/pages/applicant/components"
import type { AutoSaveStatus } from "@/ui/hooks"
import type { ApplicantFormValues } from "./editor-form"

export function ApplicantEditorPersonalView({
  form,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
}: ApplicantEditorPersonalViewProperties) {
  const { register } = form

  return (
    <ApplicantFormPage
      title="Persönlich"
      isLoading={isLoading}
      saveStatus={saveStatus}
      useHeaderAutoSave={useHeaderAutoSave}
    >
      <Section title="Kontakt">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" {...register("personal.name")} />
          <Input label="E-Mail" {...register("personal.email")} />
          <Input label="Telefon" {...register("personal.phone")} />
        </div>
      </Section>

      <Section title="Persönliche Angaben">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input label="Geburtsdatum" {...register("personal.birthdate")} />
            <div className="mt-1">
              <Checkbox {...register("personal.discloseBirthdate")} />
            </div>
          </div>
          <div>
            <Input label="Geschlecht" {...register("personal.gender")} />
            <div className="mt-1">
              <Checkbox {...register("personal.discloseGender")} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Adresse">
        <div className="grid grid-cols-3 gap-3">
          <Input label="Straße" {...register("personal.address.street")} />
          <Input label="PLZ" {...register("personal.address.zip")} />
          <Input label="Stadt" {...register("personal.address.city")} />
        </div>
        <Checkbox {...register("personal.discloseAddress")} />
      </Section>
    </ApplicantFormPage>
  )
}

interface ApplicantEditorPersonalViewProperties {
  form: UseFormReturn<ApplicantFormValues>
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
}
