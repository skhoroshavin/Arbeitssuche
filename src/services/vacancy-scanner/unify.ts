import type { VacancyDetails } from "@/plugins/job-site/types.js";
import type {
  Vacancy,
  FoundActivity,
  NotFoundActivity,
  VacancyContact,
} from "@/models/vacancy/types.js";
import { vacancyHash } from "@/services/vacancy-scanner/vacancy-hash.js";
import { htmlToMarkdown } from "@/services/vacancy-scanner/markdown.js";

function contactFromDetails(
  details: VacancyDetails,
): VacancyContact | undefined {
  if (!details.contact) return undefined;
  const { name, email, phone } = details.contact;
  if (!name && !email && !phone) return undefined;
  return { name, email, phone };
}

export interface ProcessOneResult {
  vacancy: Vacancy;
  hash: string;
  isNew: boolean;
  descriptionChanged: boolean;
}

export function processOneCrawlResult(
  details: VacancyDetails,
  siteName: string,
  existingByHash: Map<string, Vacancy>,
  crawlDate: string,
): ProcessOneResult {
  const hash = vacancyHash(
    details.title,
    details.company,
    details.address,
    details.contact?.name,
  );

  const contact = contactFromDetails(details);
  const description = details.descriptionHtml
    ? htmlToMarkdown(details.descriptionHtml)
    : undefined;

  const foundActivity: FoundActivity = {
    type: "found",
    date: crawlDate,
    site: siteName,
    url: details.url,
    description,
    contact,
  };

  const existing = existingByHash.get(hash);

  if (existing) {
    const mergedUrls = [...new Set([...existing.urls, details.url])];
    const mergedAddresses = details.address
      ? [...new Set([...existing.addresses, details.address])]
      : existing.addresses;

    const descriptionChanged =
      !!description &&
      !!existing.description &&
      description !== existing.description;

    const vacancy: Vacancy = {
      ...existing,
      urls: mergedUrls,
      addresses: mergedAddresses,
      description: description ?? existing.description,
      descriptionChanged,
      contact: contact ?? existing.contact,
      startDate: details.startDate ?? existing.startDate,
      activityHistory: [...existing.activityHistory, foundActivity],
      active: true,
    };

    return { vacancy, hash, isNew: false, descriptionChanged };
  }

  const vacancy: Vacancy = {
    hash,
    title: details.title ?? "",
    company: details.company ?? "",
    urls: [details.url],
    addresses: details.address ? [details.address] : [],
    contact,
    startDate: details.startDate,
    description,
    descriptionChanged: false,
    activityHistory: [foundActivity],
    active: true,
  };

  return { vacancy, hash, isNew: true, descriptionChanged: false };
}

export interface MarkUnseenResult {
  vacancies: Vacancy[];
  goneCount: number;
}

export function markUnseenAsGone(
  allVacancies: Vacancy[],
  seenHashes: Set<string>,
  crawlDate: string,
): MarkUnseenResult {
  let goneCount = 0;
  const vacancies = allVacancies.map((v) => {
    if (seenHashes.has(v.hash) || !v.active) return v;

    goneCount++;
    const notFoundActivity: NotFoundActivity = {
      type: "not-found",
      date: crawlDate,
      site: "all",
    };
    return {
      ...v,
      active: false,
      activityHistory: [...v.activityHistory, notFoundActivity],
    };
  });

  return { vacancies, goneCount };
}
