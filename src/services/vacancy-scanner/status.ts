import type { Vacancy, VacancyStatus } from "@/models/vacancy/types.js";

export function deriveStatus(vacancy: Vacancy): VacancyStatus {
  const userActivities = vacancy.activityHistory.filter(
    (a) => a.type !== "found" && a.type !== "not-found",
  );

  if (userActivities.length === 0) {
    if (!vacancy.active) return "gone";

    const wasGone = vacancy.activityHistory.some((a) => a.type === "not-found");
    return wasGone ? "renewed" : "new";
  }

  const types = new Set(userActivities.map((a) => a.type));

  if (types.has("rejected")) return "rejected";
  if (types.has("offered")) return "offered";
  if (types.has("interviewed")) return "interviewed";
  if (types.has("invited")) return "invited";

  if (types.has("applied")) {
    return vacancy.active ? "applied" : "ignored";
  }

  if (types.has("not-interested")) return "not-interested";

  return vacancy.active ? "new" : "gone";
}
