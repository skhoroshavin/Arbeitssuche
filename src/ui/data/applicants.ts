import { z } from "zod"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { Applicant, ApplicantInfoSchema } from "@/models/applicant"

import type { ResumeTemplate } from "@/models/applicant"

import { api } from "./internal/api"

export function useApplicantListView() {
  const query = useApplicants()
  return {
    ...query,
    data: query.data?.applicants ?? [],
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
      Applicant.parse(await api().invoke("applicants:load", id)),
    enabled: !!id,
  })
}

export function useApplicantDraft() {
  return useQuery({
    queryKey: ["applicant-draft"],
    queryFn: async () => {
      const raw = await api().invoke("applicants:draft:load")
      const parsed = ApplicantDraftResponseSchema.parse(raw)
      return { draft: parsed.draft ? Applicant.parse(parsed.draft) : undefined }
    },
  })
}

export function useSaveApplicantDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: Applicant) =>
      api().invoke("applicants:draft:save", draft),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicant-draft"] }),
  })
}

export function useDeleteApplicantDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api().invoke("applicants:draft:delete"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applicant-draft"] }),
  })
}

export function useFinalizeApplicantDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () =>
      CreatedIdSchema.parse(await api().invoke("applicants:draft:finalize")),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["applicant-draft"] })
      await queryClient.invalidateQueries({ queryKey: ["applicants"] })
      await queryClient.invalidateQueries({ queryKey: ["applicant", id] })
    },
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
      a.style.display = "none"
      const filename = applicantName
        ? `${applicantName.toLowerCase().replaceAll(" ", "_")}_lebenslauf.pdf`
        : `${id}_lebenslauf.pdf`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      // Keep blob URL alive while download starts
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)
    },
  })
}

export function useConsultSearchesView(applicantId: string) {
  const mutation = useConsultSearches(applicantId)
  return {
    ...mutation,
    suggestions: mutation.data?.suggestions ?? [],
  }
}

function useConsultSearches(applicantId: string) {
  return useMutation({
    mutationFn: async () =>
      SuggestionsResponseSchema.parse(
        await api().invoke("applicants:consult-searches", applicantId),
      ),
  })
}

function useApplicants() {
  return useQuery({
    queryKey: ["applicants"],
    queryFn: async () =>
      ApplicantListResponseSchema.parse(await api().invoke("applicants:list")),
  })
}

const CreatedIdSchema = z.object({ id: z.string() })

const ApplicantDraftResponseSchema = z.object({
  draft: z.unknown().optional(),
})

const ApplicantListResponseSchema = z.object({
  applicants: z.array(ApplicantInfoSchema),
})

const SuggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      searchTerm: z.string(),
      searchMode: z.enum(["employment", "entry-level", "apprenticeship"]),
      reason: z.string(),
    }),
  ),
})
