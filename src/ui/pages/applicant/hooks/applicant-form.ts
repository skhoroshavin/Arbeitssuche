import { useParams } from "react-router";
import { useApplicant, useUpdateApplicant } from "@/ui/data/applicants";
import { useAutoSaveForm } from "@/ui/hooks/auto-save-form";
import type {
  Applicant,
  ApplicantEducation,
  ApplicantExperience,
  ApplicantPersonal,
} from "@/models/applicant/types";

interface FormExperience extends Omit<ApplicantExperience, "highlights"> {
  highlights?: string;
}

interface FormEducation extends Omit<ApplicantEducation, "highlights"> {
  highlights?: string;
}

interface FormPersonal extends Omit<ApplicantPersonal, "hobbies"> {
  hobbies?: string;
}

interface ApplicantFormValues extends Omit<
  Applicant,
  "experience" | "education" | "personal" | "personalNotes"
> {
  personal: FormPersonal;
  experience: FormExperience[];
  education: FormEducation[];
  personalNotes?: string;
}

function joinArray(arr: string[] | undefined): string | undefined {
  return Array.isArray(arr) ? arr.join("\n") : arr;
}

function splitLines(val: string | string[] | undefined): string[] | undefined {
  return typeof val === "string"
    ? val
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : val;
}

function toFormValues(applicant: Applicant): ApplicantFormValues {
  return {
    ...applicant,
    personal: {
      ...applicant.personal,
      hobbies: joinArray(applicant.personal.hobbies),
    },
    experience: applicant.experience.map((e) => ({
      ...e,
      highlights: joinArray(e.highlights),
    })),
    education: applicant.education.map((e) => ({
      ...e,
      highlights: joinArray(e.highlights),
    })),
    personalNotes: joinArray(applicant.personalNotes),
  };
}

function fromFormValues(form: ApplicantFormValues): Applicant {
  return {
    ...form,
    personal: {
      ...form.personal,
      hobbies: splitLines(form.personal.hobbies),
    },
    experience: form.experience.map((e) => ({
      ...e,
      highlights: splitLines(e.highlights),
    })),
    education: form.education.map((e) => ({
      ...e,
      highlights: splitLines(e.highlights),
    })),
    personalNotes: splitLines(form.personalNotes),
  };
}

export function useApplicantForm() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useApplicant(id!);
  const update = useUpdateApplicant(id!);

  return useAutoSaveForm<ApplicantFormValues, Applicant>({
    queryResult: { data, isLoading },
    toFormValues,
    onSave: async (formData) => {
      const parsed = fromFormValues(formData);
      await update.mutateAsync({ ...data!, ...parsed, id: id! });
    },
  });
}
