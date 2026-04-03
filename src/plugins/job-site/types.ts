export type SearchMode = "employment" | "entry-level" | "apprenticeship"

export interface SearchCriteria {
  location: string
  query: string
  radiusKm?: number
  mode: SearchMode
}

export interface VacancyListPage {
  urls: string[]
  nextPageId?: string
}

export interface VacancyContact {
  name?: string
  email?: string
  phone?: string
}

export interface VacancyDetails {
  url: string
  title: string
  company: string
  address?: string
  descriptionHtml?: string
  startDate?: string
  publishedAt?: string
  contact?: VacancyContact
}

export interface JobSite {
  name: string
  supportedModes: SearchMode[]
  getVacancyList(
    criteria: SearchCriteria,
    pageId?: string,
  ): Promise<VacancyListPage>
  getVacancyDetails(url: string): Promise<VacancyDetails>
}

// --- JSON-LD types for job posting structured data ---

export interface JobPostingJsonLd {
  title?: string
  description?: string
  datePosted?: string
  hiringOrganization?: { name?: string }
  jobLocation?:
    | { address?: JobPostingAddress }
    | { address?: JobPostingAddress }[]
}

interface JobPostingAddress {
  streetAddress?: string
  postalCode?: string
  addressLocality?: string
}
