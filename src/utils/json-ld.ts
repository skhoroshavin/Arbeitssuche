import type { CheerioAPI } from "cheerio/slim";

interface JobPostingData {
  title?: string;
  company?: string;
  address?: string;
  descriptionHtml?: string;
  publishedAt?: string;
}

export function extractJobPostingFromJsonLd(
  $: CheerioAPI,
): JobPostingData | null {
  let result: JobPostingData | null = null;

  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const data = JSON.parse($(el).html() || "");
      if (data["@type"] !== "JobPosting") return;

      const posting: JobPostingData = {};
      posting.title = data.title;
      posting.company = data.hiringOrganization?.name;

      const loc = Array.isArray(data.jobLocation)
        ? data.jobLocation[0]
        : data.jobLocation;
      if (loc?.address) {
        const a = loc.address;
        posting.address = [a.streetAddress, a.postalCode, a.addressLocality]
          .filter(Boolean)
          .join(", ");
      }

      if (data.description) {
        posting.descriptionHtml = data.description;
      }
      if (data.datePosted) posting.publishedAt = data.datePosted;

      result = posting;
    } catch {
      // JSON-LD parse failed — fall through to DOM selectors
    }
  });

  return result;
}
