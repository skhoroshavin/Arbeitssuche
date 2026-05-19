import { z } from "zod"

export const SEARCH_MODES = [
  "employment",
  "entry-level",
  "apprenticeship",
] as const

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  employment: "Festanstellung",
  "entry-level": "Berufseinsteiger",
  apprenticeship: "Ausbildung",
}

export interface JobSearchInfo {
  id: JobSearchID
  displayName: string
}

export interface JobSearchCriteria {
  location: string
  query: string
  radiusKm: number
  mode: SearchMode
  limit?: number
}

export interface ConsultationSuggestion {
  searchTerm: string
  searchMode: SearchMode
  reason: string
}

export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export function makeSearchSource(value: string): SearchSource {
  return { value }
}

export interface SearchSource {
  value: string
}

export function makeJobSearchID(value: string): JobSearchID {
  return { value }
}

export interface JobSearchID {
  value: string
}

export class JobSearch {
  searchTerm = ""
  radiusKm = 30
  mode: SearchMode = "employment"
  sources: SearchSource[] = []
  maxResultsPerSource = 0
  maxCommuteMinutes = 0
  notes = ""
  coverLetter = ""

  static parse(data: unknown): JobSearch {
    const parsed = JobSearchInputSchema.parse(data)
    const jobSearch = new JobSearch()
    fillFromParsed(jobSearch, parsed)
    return jobSearch
  }

  isDifferentFromDefault(): boolean {
    const checks = [
      this.searchTerm.trim().length > 0,
      this.radiusKm !== 30,
      this.mode !== "employment",
      this.sources.length > 0,
      this.maxResultsPerSource !== 0,
      this.maxCommuteMinutes !== 0,
      this.notes.trim().length > 0,
      this.coverLetter.trim().length > 0,
    ]
    return checks.some(Boolean)
  }
}

export const JobSearchInfoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
})

function fillFromParsed(
  jobSearch: JobSearch,
  parsed: z.infer<typeof JobSearchInputSchema>,
): void {
  jobSearch.searchTerm = parsed.searchTerm
  jobSearch.radiusKm = parsed.radiusKm
  jobSearch.mode = parsed.mode
  jobSearch.sources = parsed.sources.map((s) => makeSearchSource(s.value))
  jobSearch.maxResultsPerSource = parsed.maxResultsPerSource
  jobSearch.maxCommuteMinutes = parsed.maxCommuteMinutes
  jobSearch.notes = parsed.notes
  jobSearch.coverLetter = parsed.coverLetter
}

const JobSearchInputSchema = z.object({
  searchTerm: z.string().default(""),
  radiusKm: z.number().default(30),
  mode: z
    .enum(["employment", "entry-level", "apprenticeship"])
    .default("employment"),
  sources: z.array(z.object({ value: z.string().default("") })).default([]),
  maxResultsPerSource: z.number().default(0),
  maxCommuteMinutes: z.number().default(0),
  notes: z.string().default(""),
  coverLetter: z.string().default(""),
})
