import type { ActivityType, MatchScore, VacancyStatus } from "./vacancy.js"

export type StatusLabelKey = VacancyStatus | "all" | ActivityType

export const STATUS_LABELS: Record<StatusLabelKey, string> = {
  all: "Alle",
  new: "Neu",
  gone: "Weg",
  renewed: "Erneuert",
  applied: "Beworben",
  ignored: "Ignoriert",
  invited: "Eingeladen",
  interviewed: "Gespräch",
  offered: "Angebot",
  rejected: "Abgelehnt",
  "not-interested": "Nicht interessant",
  found: "Gefunden",
  "not-found": "Nicht gefunden",
}

export const MATCH_SCORE_LABELS: Record<MatchScore, string> = {
  "very-bad": "Sehr schlecht",
  bad: "Schlecht",
  ok: "OK",
  good: "Gut",
  excellent: "Ausgezeichnet",
  unknown: "Unbekannt",
}

export const STATUS_COLORS: Record<VacancyStatus, string> = {
  new: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
  gone: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
  renewed: "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300",
  applied: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  ignored:
    "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300",
  invited:
    "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300",
  interviewed:
    "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300",
  offered: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300",
  rejected: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
  "not-interested":
    "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
}

const COLORS = {
  apply: "bg-blue-600 hover:bg-blue-700",
  invite: "bg-purple-600 hover:bg-purple-700",
  offer: "bg-pink-600 hover:bg-pink-700",
  reject: "bg-red-600 hover:bg-red-700",
  interview: "bg-indigo-600 hover:bg-indigo-700",
  dismiss: "bg-orange-600 hover:bg-orange-700",
} as const

export interface StatusAction {
  type: ActivityType
  label: string
  color: string
}

const NOT_INTERESTED_ACTION: StatusAction = {
  type: "not-interested",
  label: "Nicht interessant",
  color: COLORS.dismiss,
}

const FOLLOW_UP_ACTIONS: StatusAction[] = [
  { type: "invited", label: "Einladen", color: COLORS.invite },
  { type: "offered", label: "Angebot", color: COLORS.offer },
  { type: "rejected", label: "Ablehnen", color: COLORS.reject },
]

export const TRANSITIONS: Record<VacancyStatus, StatusAction[]> = {
  new: [
    { type: "applied", label: "Bewerben", color: COLORS.apply },
    NOT_INTERESTED_ACTION,
  ],
  renewed: [
    { type: "applied", label: "Bewerben", color: COLORS.apply },
    NOT_INTERESTED_ACTION,
  ],
  gone: [],
  applied: FOLLOW_UP_ACTIONS,
  ignored: FOLLOW_UP_ACTIONS,
  invited: [
    { type: "interviewed", label: "Gespräch", color: COLORS.interview },
    { type: "offered", label: "Angebot", color: COLORS.offer },
    { type: "rejected", label: "Ablehnen", color: COLORS.reject },
  ],
  interviewed: [
    { type: "invited", label: "Einladen", color: COLORS.invite },
    { type: "offered", label: "Angebot", color: COLORS.offer },
    { type: "rejected", label: "Ablehnen", color: COLORS.reject },
  ],
  offered: [{ type: "rejected", label: "Ablehnen", color: COLORS.reject }],
  rejected: [],
  "not-interested": [
    { type: "applied", label: "Bewerben", color: COLORS.apply },
  ],
}
