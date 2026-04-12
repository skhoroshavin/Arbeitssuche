import type {
  Activity,
  CommuteInfo,
  MatchScore,
  VacancyContact,
  VacancyDTO,
} from "@/models/vacancy/types.js"

export function resolveVacancy(data: Partial<VacancyDTO>): VacancyDTO {
  return {
    hash: resolveText(data.hash),
    title: resolveText(data.title),
    company: resolveText(data.company),
    urls: resolveStringList(data.urls),
    addresses: resolveStringList(data.addresses),
    contact: resolveVacancyContact(data.contact ?? DEFAULT_CONTACT),
    startDate: resolveText(data.startDate),
    description: resolveText(data.description),
    enriched: data.enriched ?? !!(data.summary ?? ""),
    enrichmentDirty: resolveFlag(data.enrichmentDirty, false),
    summary: resolveText(data.summary),
    matchScore: resolveMatchScore(data.matchScore),
    commute: resolveCommute(data.commute),
    activityHistory: resolveActivityHistory(data.activityHistory),
    active: resolveFlag(data.active, true),
  }
}

const DEFAULT_CONTACT: VacancyContact = {}

function resolveStringList(values?: string[]): string[] {
  return values ?? []
}

function resolveText(value?: string): string {
  return value ?? ""
}

function resolveCommute(
  commute?: Record<string, CommuteInfo>,
): Record<string, CommuteInfo> {
  return commute ?? DEFAULT_COMMUTE
}

const DEFAULT_COMMUTE: Record<string, CommuteInfo> = {}

function resolveActivityHistory(activityHistory?: Activity[]): Activity[] {
  return activityHistory ?? []
}

function resolveFlag(value: boolean | undefined, fallback: boolean): boolean {
  return value ?? fallback
}

function resolveMatchScore(value?: MatchScore): MatchScore {
  return value ?? "ok"
}

function resolveVacancyContact(contact?: VacancyContact): VacancyContact {
  return {
    name: contact?.name,
    email: contact?.email,
    phone: contact?.phone,
  }
}
