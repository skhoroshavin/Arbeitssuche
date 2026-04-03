import path from "node:path";
import { parseArgs } from "node:util";
import { SEARCH_MODES } from "@/models/job-search/index.js";
import { createPlaywrightBrowser } from "@/plugins/browser/index.js";
import { createJobSite, getJobSiteNames } from "@/plugins/job-site/index.js";
import type { SearchMode } from "@/models/job-search/types.js";

const { values } = parseArgs({
  options: {
    site: { type: "string" },
    location: { type: "string", default: "Berlin" },
    query: { type: "string", default: "" },
    mode: { type: "string", default: "employment" },
    "out-dir": { type: "string", default: "src/plugins/job-site" },
  },
});

const SEARCH_MODE_SET: ReadonlySet<string> = new Set(SEARCH_MODES);

function isSearchMode(value: string | undefined): value is SearchMode {
  return value !== undefined && SEARCH_MODE_SET.has(value);
}

if (!isSearchMode(values.mode)) {
  throw new Error(
    `Invalid mode: ${values.mode}. Available: ${SEARCH_MODES.join(", ")}`,
  );
}
const mode = values.mode;
const location = values.location;
const query = values.query;
const outputDirectory = values["out-dir"];

const allSiteNames = getJobSiteNames();
const sitesToRun = values.site ? [values.site] : allSiteNames;

const unknown = sitesToRun.filter((s) => !allSiteNames.includes(s));
if (unknown.length > 0) {
  throw new Error(
    `Unknown sites: ${unknown.join(", ")}. Available: ${allSiteNames.join(", ")}`,
  );
}

console.log(`Downloading HTML samples for: ${sitesToRun.join(", ")}`);
console.log(`Search: "${query}" in ${location}, mode: ${mode}`);
console.log(`Output dir: ${outputDirectory}`);

for (const siteName of sitesToRun) {
  const recordDirectory = path.join(outputDirectory, siteName, "html_samples");

  const browser = await createPlaywrightBrowser({ recordDirectory });
  try {
    const site = createJobSite(siteName, browser);
    const criteria = { location, query, mode };

    // Collect URLs via pagination
    let pageId: string | undefined;
    const allUrls: string[] = [];
    for (let n = 1; n <= 2; n++) {
      console.log(`[${siteName}] Fetching search page ${n}`);
      const result = await site.getVacancyList(criteria, pageId);
      allUrls.push(...result.urls);
      if (!result.nextPageId) break;
      pageId = result.nextPageId;
    }

    // Fetch vacancy details (up to 5)
    const sample = allUrls.slice(0, 5);
    for (let index = 0; index < sample.length; index++) {
      console.log(
        `[${siteName}] Fetching vacancy ${index + 1}/${sample.length}: ${sample[index]}`,
      );
      try {
        await site.getVacancyDetails(sample[index]);
      } catch (error) {
        console.error(`[${siteName}] Failed: ${sample[index]}`, error);
      }
    }

    console.log(`[${siteName}] Saved to ${recordDirectory}`);
  } finally {
    await browser.close();
  }
}

console.log("\nDone. Run: npm test");
