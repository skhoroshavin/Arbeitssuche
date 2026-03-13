export type ActivityType =
  | "found"
  | "not-found"
  | "applied"
  | "invited"
  | "interviewed"
  | "offered"
  | "rejected"
  | "not-interested";

export interface VacancyContact {
  name?: string;
  email?: string;
  phone?: string;
}

interface BaseActivity {
  date: string;
  notes?: string;
}

export interface FoundActivity extends BaseActivity {
  type: "found";
  site: string;
  url: string;
  description?: string;
  contact?: VacancyContact;
}

export interface NotFoundActivity extends BaseActivity {
  type: "not-found";
  site: string;
}

export interface AppliedActivity extends BaseActivity {
  type: "applied";
}

export interface InvitedActivity extends BaseActivity {
  type: "invited";
  interviewDate: string;
}

export interface InterviewedActivity extends BaseActivity {
  type: "interviewed";
  outcome: "completed" | "cancelled";
}

export interface OfferedActivity extends BaseActivity {
  type: "offered";
  startDate?: string;
  salary?: string;
}

export interface RejectedActivity extends BaseActivity {
  type: "rejected";
}

export interface NotInterestedActivity extends BaseActivity {
  type: "not-interested";
}

export type Activity =
  | FoundActivity
  | NotFoundActivity
  | AppliedActivity
  | InvitedActivity
  | InterviewedActivity
  | OfferedActivity
  | RejectedActivity
  | NotInterestedActivity;

export type MatchScore = "very-bad" | "bad" | "ok" | "good" | "excellent";

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
  | "not-interested";

interface CommuteDurations {
  morning: string;
  day: string;
  evening: string;
}

export interface CommuteInfo {
  distance: string;
  durations: CommuteDurations;
  fetchedAt: string;
}

export interface VacancySource {
  site: string;
  url: string;
}

export interface Vacancy {
  hash: string;
  title: string;
  company: string;
  urls: string[];
  addresses: string[];
  contact?: VacancyContact;
  startDate?: string;
  description?: string;
  descriptionChanged: boolean;
  summary?: string;
  matchScore?: MatchScore;
  commute?: Record<string, CommuteInfo>;
  activityHistory: Activity[];
  active: boolean;
}
