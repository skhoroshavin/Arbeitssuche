import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio/slim";
import { extractJobPostingFromJsonLd } from "./json-ld.js";

function html(jsonLd: object): ReturnType<typeof cheerio.load> {
  return cheerio.load(
    `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`,
  );
}

describe("extractJobPostingFromJsonLd", () => {
  test("extracts title and company from JobPosting", () => {
    const $ = html({
      "@type": "JobPosting",
      title: "Developer",
      hiringOrganization: { name: "Acme" },
    });
    const result = extractJobPostingFromJsonLd($);
    assert.equal(result?.title, "Developer");
    assert.equal(result?.company, "Acme");
  });

  test("extracts address from jobLocation", () => {
    const $ = html({
      "@type": "JobPosting",
      title: "Dev",
      jobLocation: {
        address: {
          streetAddress: "Main St 1",
          postalCode: "12345",
          addressLocality: "Berlin",
        },
      },
    });
    const result = extractJobPostingFromJsonLd($);
    assert.equal(result?.address, "Main St 1, 12345, Berlin");
  });

  test("extracts description and datePosted", () => {
    const $ = html({
      "@type": "JobPosting",
      title: "Dev",
      description: "<p>Job desc</p>",
      datePosted: "2026-01-15",
    });
    const result = extractJobPostingFromJsonLd($);
    assert.equal(result?.descriptionHtml, "<p>Job desc</p>");
    assert.equal(result?.publishedAt, "2026-01-15");
  });

  test("returns null when no JobPosting found", () => {
    const $ = cheerio.load("<html><body>No JSON-LD</body></html>");
    assert.equal(extractJobPostingFromJsonLd($), null);
  });

  test("returns null for non-JobPosting JSON-LD", () => {
    const $ = html({ "@type": "Organization", name: "Acme" });
    assert.equal(extractJobPostingFromJsonLd($), null);
  });

  test("handles array jobLocation", () => {
    const $ = html({
      "@type": "JobPosting",
      title: "Dev",
      jobLocation: [
        { address: { addressLocality: "Berlin" } },
        { address: { addressLocality: "Munich" } },
      ],
    });
    const result = extractJobPostingFromJsonLd($);
    assert.equal(result?.address, "Berlin");
  });
});
