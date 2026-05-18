export interface JobSearchID {
  value: string
}

export function JobSearchID(value: string): JobSearchID {
  return { value }
}

export interface SearchSource {
  value: string
}

export function SearchSource(value: string): SearchSource {
  return { value }
}
