import type { Vacancy, VacancySource } from "@/models/vacancy/types.js";

export type { VacancySource };

export function deriveSources(vacancy: Vacancy): VacancySource[] {
  const seen = new Set<string>();
  const sources: VacancySource[] = [];

  for (const activity of vacancy.activityHistory) {
    if (activity.type !== "found") continue;
    const key = `${activity.site}\0${activity.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ site: activity.site, url: activity.url });
  }

  return sources;
}
