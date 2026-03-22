import { useInvalidate } from "@/ui/hooks";
import { ipcFetch } from "./internal/ipc-client";
import { useIpcMutation } from "./internal/use-ipc-mutation";
import { useIpcQuery } from "./internal/use-ipc-query";
import type {
  Applicant,
  ApplicantInfo,
  ResumeTemplate,
} from "@/models/applicant/types";
import type { ConsultationSuggestion } from "@/models/job-search/types";

export function useApplicants() {
  return useIpcQuery({
    queryKey: ["applicants"],
    queryFn: () => ipcFetch<{ applicants: ApplicantInfo[] }>("/applicants"),
  });
}

export function useApplicant(id: string) {
  return useIpcQuery({
    queryKey: ["applicant", id],
    queryFn: () => ipcFetch<Applicant>(`/applicants/${id}`),
    enabled: !!id,
  });
}

export function useCreateApplicant() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (body: { name: string }) =>
      ipcFetch("/applicants", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidate(["applicants"]),
  });
}

export function useUpdateApplicant(id: string) {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (data: Applicant) =>
      ipcFetch(`/applicants/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(["applicant", id]),
  });
}

export function useDeleteApplicant() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (id: string) =>
      ipcFetch(`/applicants/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(["applicants"]),
  });
}

export function useConsultSearches(applicantId: string) {
  return useIpcMutation({
    mutationFn: () =>
      ipcFetch<{ suggestions: ConsultationSuggestion[] }>(
        `/applicants/${applicantId}/consult-searches`,
        { method: "POST" },
      ),
  });
}

export function useDownloadResume(id: string, applicantName: string) {
  return useIpcMutation({
    mutationFn: async (template: ResumeTemplate) => {
      const buffer = await window.electronAPI!.invoke(
        "applicants:resume",
        id,
        template,
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- IPC returns unknown
      const blob = new Blob([buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = applicantName
        ? `${applicantName.toLowerCase().replace(/ /g, "_")}_lebenslauf.pdf`
        : `${id}_lebenslauf.pdf`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
