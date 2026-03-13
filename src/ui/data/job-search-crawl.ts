import {
  useIpcQuery,
  useIpcMutation,
  useInvalidate,
  ipcFetch,
} from "@/ui/hooks";

export function useStartJobSearchCrawl(id: string) {
  const invalidate = useInvalidate();
  return useIpcMutation({
    mutationFn: () =>
      ipcFetch<{ jobId: string }>(`/job-searches/${id}/crawls`, {
        method: "POST",
      }),
    onSuccess: () => {
      invalidate(["job-search-vacancies", id]);
    },
  });
}

export function useAbortJobSearchCrawl(id: string) {
  return useIpcMutation({
    mutationFn: () =>
      ipcFetch(`/job-searches/${id}/crawls/active`, { method: "DELETE" }),
  });
}

export function useSites() {
  return useIpcQuery({
    queryKey: ["sites"],
    queryFn: () =>
      ipcFetch<{
        sites: { name: string; supportedModes: string[] }[];
      }>("/sites"),
  });
}
