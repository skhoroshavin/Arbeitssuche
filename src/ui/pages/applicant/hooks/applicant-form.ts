import { useParams } from "react-router";
import { useApplicant, useUpdateApplicant } from "@/ui/data/applicants";
import { useAutoSaveForm } from "@/ui/hooks/auto-save-form";
import type {
  Applicant,
  ApplicantDisclose,
  ApplicantSkill,
  ApplicantLanguage,
  ApplicantCertification,
  Address,
} from "@/models/applicant/types";
import { arrayToString, stringToArray } from "@/models/utilities";

export function useApplicantForm() {
  const { id = "" } = useParams<{ id: string }>();
  const { data, isLoading } = useApplicant(id);
  const update = useUpdateApplicant(id);

  return useAutoSaveForm<ApplicantFormValues, Applicant>({
    queryResult: { data, isLoading },
    toFormValues,
    onSave: async (formData) => {
      const parsed = fromFormValues(formData);
      if (!data) throw new Error("Applicant data not loaded");
      await update.mutateAsync({ ...data, ...parsed, id });
    },
  });
}

function toFormValues(applicant: Applicant): ApplicantFormValues {
  return {
    ...applicant,
    personal: {
      ...applicant.personal,
      hobbies: arrayToString(applicant.personal.hobbies),
    },
    experience: applicant.experience.map((entry) => ({
      ...entry,
      highlights: arrayToString(entry.highlights),
    })),
    education: applicant.education.map((entry) => ({
      ...entry,
      highlights: arrayToString(entry.highlights),
    })),
    personalNotes: arrayToString(applicant.personalNotes),
  };
}

function fromFormValues(form: ApplicantFormValues): Applicant {
  return {
    ...form,
    personal: {
      ...form.personal,
      hobbies: stringToArray(form.personal.hobbies),
    },
    experience: form.experience.map((entry) => ({
      ...entry,
      highlights: stringToArray(entry.highlights),
    })),
    education: form.education.map((entry) => ({
      ...entry,
      highlights: stringToArray(entry.highlights),
    })),
    personalNotes: stringToArray(form.personalNotes),
  };
}

interface ApplicantFormValues {
  id: string;
  personal: FormPersonal;
  disclose?: ApplicantDisclose;
  experience: FormExperience[];
  education: FormEducation[];
  skills: ApplicantSkill[];
  languages: ApplicantLanguage[];
  certifications: ApplicantCertification[];
  personalNotes?: string;
}

interface FormExperience {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  location?: string;
  discloseDates?: boolean;
  highlights?: string;
}

interface FormEducation {
  institution: string;
  course: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  discloseDates?: boolean;
  highlights?: string;
}

interface FormPersonal {
  name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  gender?: string;
  address?: Address;
  hobbies?: string;
}
