import { useInvalidate } from "@/ui/hooks";
import { ipcFetch } from "./internal/ipc-client";
import { useIpcMutation } from "./internal/use-ipc-mutation";
import { useIpcQuery } from "./internal/use-ipc-query";
import type { JobSearch, JobSearchInfo } from "@/models/job-search/types";
import type {
  VacancyDTO,
  VacancySource,
  VacancyStatus,
} from "@/models/vacancy/types";

export type { VacancySource };

export type VacancyWithStatus = VacancyDTO & {
  status: VacancyStatus;
  sources: VacancySource[];
};

interface VacancyListResponse {
  vacancies: VacancyWithStatus[];
  totalCount: number;
  generatedAt?: string;
  latestCrawl?: string;
}

export function useJobSearches(applicantId?: string) {
  const params = applicantId ? `?applicantId=${applicantId}` : "";
  return useIpcQuery({
    queryKey: ["job-searches", applicantId ?? "all"],
    queryFn: () =>
      ipcFetch<{ jobSearches: JobSearchInfo[] }>(`/job-searches${params}`),
  });
}

export function useJobSearch(id: string) {
  return useIpcQuery({
    queryKey: ["job-search", id],
    queryFn: () => ipcFetch<JobSearch>(`/job-searches/${id}`),
    enabled: !!id,
  });
}

export function useCreateJobSearch() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (body: {
      searchTerm: string;
      applicantId: string;
      searchMode?: string;
    }) =>
      ipcFetch("/job-searches", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidate(["job-searches"]),
  });
}

export function useUpdateJobSearch(id: string) {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (data: JobSearch) =>
      ipcFetch(`/job-searches/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(["job-search", id]),
  });
}

export function useDeleteJobSearch() {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (id: string) =>
      ipcFetch(`/job-searches/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(["job-searches"]),
  });
}

export function useJobSearchCoverLetter(id: string) {
  return useIpcQuery({
    queryKey: ["job-search-cover-letter", id],
    queryFn: () =>
      ipcFetch<{ content: string }>(`/job-searches/${id}/cover-letter`),
    enabled: !!id,
  });
}

export function useUpdateJobSearchCoverLetter(id: string) {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (content: string) =>
      ipcFetch(`/job-searches/${id}/cover-letter`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => invalidate(["job-search-cover-letter", id]),
  });
}

export function useGenerateCoverLetter(id: string) {
  return useIpcMutation({
    mutationFn: () =>
      ipcFetch<{ content: string }>(
        `/job-searches/${id}/cover-letter/generate`,
        { method: "POST" },
      ),
  });
}

export function useVacancyCoverLetter(id: string, hash: string) {
  return useIpcQuery({
    queryKey: ["vacancy-cover-letter", id, hash],
    queryFn: () =>
      ipcFetch<{ content: string }>(
        `/job-searches/${id}/vacancies/${hash}/cover-letter`,
      ),
    enabled: !!id && !!hash,
  });
}

export function useUpdateVacancyCoverLetter(id: string, hash: string) {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: (content: string) =>
      ipcFetch(`/job-searches/${id}/vacancies/${hash}/cover-letter`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => invalidate(["vacancy-cover-letter", id, hash]),
  });
}

export function useGenerateVacancyCoverLetter(id: string, hash: string) {
  return useIpcMutation({
    mutationFn: () =>
      ipcFetch<{ content: string }>(
        `/job-searches/${id}/vacancies/${hash}/cover-letter/generate`,
        { method: "POST" },
      ),
  });
}

export function useJobSearchVacancies(id: string) {
  return useIpcQuery({
    queryKey: ["job-search-vacancies", id],
    queryFn: () =>
      ipcFetch<VacancyListResponse>(`/job-searches/${id}/vacancies`),
    enabled: !!id,
  });
}

export function useJobSearchVacancy(id: string, hash: string) {
  return useIpcQuery({
    queryKey: ["job-search-vacancy", id, hash],
    queryFn: () =>
      ipcFetch<VacancyWithStatus>(`/job-searches/${id}/vacancies/${hash}`),
    enabled: !!id && !!hash,
  });
}

export function useAddActivity(id: string) {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: ({
      hash,
      activity,
    }: {
      hash: string;
      activity: Record<string, unknown>;
    }) =>
      ipcFetch(`/job-searches/${id}/vacancies/${hash}/activities`, {
        method: "POST",
        body: JSON.stringify(activity),
      }),
    onSuccess: () => {
      invalidate(["job-search-vacancies", id]);
      invalidate(["job-search-vacancy", id]);
    },
  });
}
