import type { VacancyDetails } from "@/plugins/job-site"
import type { VacancyDiscovery } from "@/models/vacancy"
import { htmlToMarkdown } from "./markdown.js"

export function toVacancyDiscovery(
  details: VacancyDetails,
  siteName: string,
  crawlDate: string,
): VacancyDiscovery {
  return {
    site: siteName,
    url: details.url,
    crawlDate,
    title: details.title,
    company: details.company,
    address: details.address.format(),
    contact: details.contact,
    description: details.descriptionHtml
      ? htmlToMarkdown(details.descriptionHtml)
      : "",
    startDate: details.startDate.value,
  }
}
