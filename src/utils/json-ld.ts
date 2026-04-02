import typia from "typia";
import type { CheerioAPI } from "cheerio/slim";

/** Extract the first JSON-LD object matching the given `@type` from a parsed HTML document. */
export function extractJsonLd(
  $: CheerioAPI,
  type: string,
): Record<string, unknown> | undefined {
  let result: Record<string, unknown> | undefined;

  $('script[type="application/ld+json"]').each((_index, element) => {
    if (result) return;
    try {
      const data = typia.json.isParse<Record<string, unknown>>(
        $(element).html() || "",
      );
      if (data && data["@type"] === type) {
        result = data;
      }
    } catch {
      // invalid JSON — skip
    }
  });

  return result;
}

export function extractAddressFromJsonLd(
  posting: JsonLdJobPosting | undefined,
): string | undefined {
  return formatAddress(resolveJobLocation(posting)?.address);
}

function resolveJobLocation(
  posting: JsonLdJobPosting | undefined,
): JsonLdJobLocation | undefined {
  if (!posting) return undefined;
  if (Array.isArray(posting.jobLocation)) {
    return posting.jobLocation[0];
  }
  return posting.jobLocation;
}

function formatAddress(
  addr:
    | { streetAddress?: string; postalCode?: string; addressLocality?: string }
    | undefined,
): string | undefined {
  if (!addr) return undefined;
  const parts = [addr.streetAddress, addr.postalCode, addr.addressLocality];
  return (
    parts.filter((value): value is string => value !== undefined).join(", ") ||
    undefined
  );
}

interface JsonLdJobPosting {
  title?: string;
  description?: string;
  datePosted?: string;
  hiringOrganization?: { name?: string };
  jobLocation?: JsonLdJobLocation | JsonLdJobLocation[];
}

interface JsonLdJobLocation {
  address?: {
    streetAddress?: string;
    postalCode?: string;
    addressLocality?: string;
  };
}
