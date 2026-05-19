export interface JobSearchID {
  value: string
}

export const JobSearchID = (value: string): JobSearchID => ({ value })

export interface SearchSource {
  value: string
}

export const SearchSource = (value: string): SearchSource => ({ value })
