import type {
  VacancyDTO,
  Activity,
  CommuteInfo,
  MatchScore,
  VacancyContact,
  VacancySource,
  VacancyStatus,
} from "./types.js";

export type { VacancySource };

/** Rich domain object wrapping VacancyDTO with derived methods. */
export class Vacancy implements VacancyDTO {
  readonly hash: string;
  readonly title: string;
  readonly company: string;
  readonly urls: string[];
  readonly addresses: string[];
  readonly contact?: VacancyContact;
  readonly startDate?: string;
  readonly description?: string;
  readonly descriptionChanged: boolean;
  readonly summary?: string;
  readonly matchScore?: MatchScore;
  readonly commute?: Record<string, CommuteInfo>;
  readonly activityHistory: Activity[];
  readonly active: boolean;

  constructor(data: VacancyDTO) {
    this.hash = data.hash;
    this.title = data.title;
    this.company = data.company;
    this.urls = Array.isArray(data.urls) ? data.urls : [];
    this.addresses = Array.isArray(data.addresses) ? data.addresses : [];
    this.contact = data.contact;
    this.startDate = data.startDate;
    this.description = data.description;
    this.descriptionChanged = data.descriptionChanged ?? false;
    this.summary = data.summary;
    this.matchScore = data.matchScore;
    this.commute = data.commute;
    this.activityHistory = Array.isArray(data.activityHistory)
      ? data.activityHistory
      : [];
    this.active = data.active ?? true;
  }

  /** Derive current status from activity history and active flag. */
  deriveStatus(): VacancyStatus {
    const userActivities = this.activityHistory.filter(
      (a) => a.type !== "found" && a.type !== "not-found",
    );

    if (userActivities.length === 0) {
      if (!this.active) return "gone";
      const wasGone = this.activityHistory.some((a) => a.type === "not-found");
      return wasGone ? "renewed" : "new";
    }

    const types = new Set(userActivities.map((a) => a.type));

    if (types.has("rejected")) return "rejected";
    if (types.has("offered")) return "offered";
    if (types.has("interviewed")) return "interviewed";
    if (types.has("invited")) return "invited";

    if (types.has("applied")) {
      return this.active ? "applied" : "ignored";
    }

    if (types.has("not-interested")) return "not-interested";

    return this.active ? "new" : "gone";
  }

  /** Extract deduplicated sources from "found" activities. */
  deriveSources(): VacancySource[] {
    const seen = new Set<string>();
    const sources: VacancySource[] = [];

    for (const activity of this.activityHistory) {
      if (activity.type !== "found") continue;
      const key = `${activity.site}\0${activity.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({ site: activity.site, url: activity.url });
    }

    return sources;
  }

  /** Minimum morning commute across all addresses in minutes, or undefined if none. */
  getMinCommuteMinutes(): number | undefined {
    if (!this.commute) return undefined;
    const infos = Object.values(this.commute);
    if (infos.length === 0) return undefined;

    let min: number | undefined;
    for (const info of infos) {
      const m = info.durations.morning;
      if (min === undefined || m < min) min = m;
    }
    return min;
  }

  /** Get date of the most recent activity, or empty string. */
  getLatestActivityDate(): string {
    return this.activityHistory.length > 0
      ? this.activityHistory[this.activityHistory.length - 1].date
      : "";
  }

  /** Create a new Vacancy with overridden fields. */
  with(overrides: Partial<VacancyDTO>): Vacancy {
    return new Vacancy({ ...this, ...overrides });
  }
}
