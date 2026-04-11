import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  Applicant,
  ApplicantInfo,
  ResumeTemplate,
} from "@/models/applicant/types"
import type { ConsultationSuggestion } from "@/models/job-search/types"
import typia from "typia"
import { api } from "./internal/api"

export function useApplicantListView() {
  const query = useApplicants()
  return {
    ...query,
    data: query.data?.applicants ?? EMPTY_APPLICANTS,
  }
}

export function useApplicantHeaderName(applicantId = "") {
  const query = useApplicant(applicantId)
  return {
    ...query,
    displayName: query.data?.personal.name || applicantId,
  }
}

export function useApplicant(id: string) {
  return useQuery({
    queryKey: ["applicant", id],
    queryFn: async () =>
      typia.assert<Applicant>(await api().invoke("applicants:load", id)),
    enabled: !!id,
  })
}

export function useCreateApplicant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string }) =>
      api().invoke("applicants:create", body.name),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicants"] }),
  })
}

export function useUpdateApplicant(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Applicant) => api().invoke("applicants:save", id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicant", id] }),
  })
}

export function useDeleteApplicant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api().invoke("applicants:delete", id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicants"] }),
  })
}

export function useDownloadResume(id: string, applicantName: string) {
  return useMutation({
    mutationFn: async (template: ResumeTemplate) => {
      const buffer = await api().invoke("applicants:resume", id, template)
      if (!(buffer instanceof ArrayBuffer)) {
        throw new TypeError("Expected ArrayBuffer from IPC")
      }
      const blob = new Blob([buffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const filename = applicantName
        ? `${applicantName.toLowerCase().replaceAll(" ", "_")}_lebenslauf.pdf`
        : `${id}_lebenslauf.pdf`
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

const EMPTY_APPLICANTS: ApplicantInfo[] = []

export function useConsultSearchesView(applicantId: string) {
  const mutation = useConsultSearches(applicantId)
  return {
    ...mutation,
    suggestions: mutation.data?.suggestions ?? EMPTY_CONSULTATION_SUGGESTIONS,
  }
}

const EMPTY_CONSULTATION_SUGGESTIONS: ConsultationSuggestion[] = []

function useConsultSearches(applicantId: string) {
  return useMutation({
    mutationFn: async () =>
      typia.assert<{ suggestions: ConsultationSuggestion[] }>(
        await api().invoke("applicants:consult-searches", applicantId),
      ),
  })
}

function useApplicants() {
  return useQuery({
    queryKey: ["applicants"],
    queryFn: async () =>
      typia.assert<{ applicants: ApplicantInfo[] }>(
        await api().invoke("applicants:list"),
      ),
  })
}
