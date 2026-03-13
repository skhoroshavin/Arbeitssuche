import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio/slim";
import { extractJobPostingFromJsonLd } from "./json-ld.js";

describe("extractJobPostingFromJsonLd", () => {
  test("extracts all fields from a valid JobPosting", () => {
    const html = `
      <html><body>
        <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Software Engineer",
          "hiringOrganization": { "name": "Acme GmbH" },
          "jobLocation": {
            "address": {
              "streetAddress": "Hauptstr. 1",
              "postalCode": "10115",
              "addressLocality": "Berlin"
            }
          },
          "description": "<p>Join our <strong>team</strong>.</p>",
          "datePosted": "2026-03-01"
        }
        </script>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractJobPostingFromJsonLd($);

    assert.ok(result);
    assert.equal(result.title, "Software Engineer");
    assert.equal(result.company, "Acme GmbH");
    assert.equal(result.address, "Hauptstr. 1, 10115, Berlin");
    assert.ok(result.descriptionHtml);
    assert.ok(
      result.descriptionHtml!.includes("<strong>team</strong>"),
      "Should be raw HTML",
    );
    assert.equal(result.publishedAt, "2026-03-01");
  });

  test("handles jobLocation as array", () => {
    const html = `
      <html><body>
        <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Manager",
          "jobLocation": [{
            "address": {
              "postalCode": "80331",
              "addressLocality": "München"
            }
          }]
        }
        </script>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const result = extractJobPostingFromJsonLd($);

    assert.ok(result);
    assert.equal(result.address, "80331, München");
  });

  test("returns null when no JobPosting script exists", () => {
    const html = `<html><body><h1>Hello</h1></body></html>`;
    const $ = cheerio.load(html);
    assert.equal(extractJobPostingFromJsonLd($), null);
  });

  test("returns null for non-JobPosting JSON-LD", () => {
    const html = `
      <html><body>
        <script type="application/ld+json">
        { "@type": "Organization", "name": "Test" }
        </script>
      </body></html>
    `;
    const $ = cheerio.load(html);
    assert.equal(extractJobPostingFromJsonLd($), null);
  });

  test("handles malformed JSON gracefully", () => {
    const html = `
      <html><body>
        <script type="application/ld+json">{ broken json }</script>
      </body></html>
    `;
    const $ = cheerio.load(html);
    assert.equal(extractJobPostingFromJsonLd($), null);
  });
});
