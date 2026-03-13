import { useApplicantForm } from "@/ui/pages/applicant/hooks/applicant-form";
import { PageHeader, Input, Loading } from "@/ui/components";
import { Checkbox } from "@/ui/pages/applicant/components/Checkbox";
import { Section } from "@/ui/pages/applicant/components/FormSection";
import { useAutoSaveHeader } from "@/ui/layout";

export default function ApplicantEditPersonal() {
  const { register, isLoading, saveStatus } = useApplicantForm();

  useAutoSaveHeader(saveStatus);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader title="Persönlich" />

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
              <Checkbox {...register("disclose.birthdate")} />
            </div>
          </div>
          <div>
            <Input label="Geschlecht" {...register("personal.gender")} />
            <div className="mt-1">
              <Checkbox {...register("disclose.gender")} />
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
        <Checkbox {...register("disclose.address")} />
      </Section>
    </div>
  );
}
