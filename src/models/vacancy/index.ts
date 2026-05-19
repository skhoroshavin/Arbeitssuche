export type ActivityType =
  | "found"
  | "not-found"
  | "applied"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested"

export type VacancyStatus =
  | "new"
  | "gone"
  | "renewed"
  | "applied"
  | "ignored"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested"

export interface VacancySource {
  site: string
  url: string
}

export interface VacancyDTO {
  hash: string
  title: string
  company: string
  urls: string[]
  addresses: string[]
  contact: VacancyContact
  startDate: string
  description: string
  enriched: boolean
  enrichmentDirty: boolean
  summary: string
  matchScore: MatchScore
  commute: Record<string, CommuteInfo>
  activityHistory: Activity[]
  active: boolean
}

export type Activity =
  | FoundActivity
  | NotFoundActivity
  | AppliedActivity
  | InvitedActivity
  | InterviewedActivity
  | OfferedActivity
  | RejectedActivity
  | NotInterestedActivity

export interface FoundActivity extends BaseActivity {
  type: "found"
  site: string
  url: string
  description: string
  contact: VacancyContact
}

export interface VacancyContact {
  name: string
  email: string
  phone: string
}

export interface NotFoundActivity extends BaseActivity {
  type: "not-found"
  site: string
}

export type MatchScore = "very-bad" | "bad" | "ok" | "good" | "excellent"

export interface CommuteInfo {
  distance: string
  durations: CommuteDurations
  fetchedAt: string
}

interface AppliedActivity extends BaseActivity {
  type: "applied"
}

interface InvitedActivity extends BaseActivity {
  type: "invited"
  interviewDate: string
}

interface InterviewedActivity extends BaseActivity {
  type: "interviewed"
  outcome: "completed" | "cancelled"
}

interface OfferedActivity extends BaseActivity {
  type: "offered"
  startDate: string
  salary: string
}

interface RejectedActivity extends BaseActivity {
  type: "rejected"
}

interface NotInterestedActivity extends BaseActivity {
  type: "not-interested"
}

interface BaseActivity {
  date: string
  notes: string
}

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}

export {
  MATCH_SCORE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TRANSITIONS,
  type StatusAction,
  type StatusLabelKey,
} from "./constants.js"
export { resolveVacancy } from "./resolve.js"
export { Vacancy } from "./vacancy.js"

export { VacancyDTOSchema, VacancyWithStatusSchema } from "./schemas.js"
