import { join } from "path";
import { parseArgs } from "node:util";
import { createPlaywrightBrowser } from "@/plugins/browser/playwright/index.js";
import { createJobSite, getJobSiteNames } from "@/plugins/job-site/index.js";
import type { SearchMode } from "@/plugins/job-site/types.js";

const { values } = parseArgs({
  options: {
    site: { type: "string" },
    location: { type: "string", default: "Berlin" },
    query: { type: "string", default: "" },
    mode: { type: "string", default: "employment" },
    "out-dir": { type: "string", default: "src/plugins/job-site" },
  },
});

const SEARCH_MODES: SearchMode[] = [
  "employment",
  "entry-level",
  "apprenticeship",
];
function isSearchMode(value: string | undefined): value is SearchMode {
  return value !== undefined && SEARCH_MODES.some((m) => m === value);
}

if (!isSearchMode(values.mode)) {
  console.error(
    `Invalid mode: ${values.mode}. Available: ${SEARCH_MODES.join(", ")}`,
  );
  process.exit(1);
}
const mode = values.mode;
const location = values.location!;
const query = values.query!;
const outDir = values["out-dir"]!;

const sitesToRun = values.site ? [values.site] : getJobSiteNames();

const unknown = sitesToRun.filter((s) => !getJobSiteNames().includes(s));
if (unknown.length) {
  console.error(`Unknown sites: ${unknown.join(", ")}`);
  console.error(`Available: ${getJobSiteNames().join(", ")}`);
  process.exit(1);
}

console.log(`Downloading HTML samples for: ${sitesToRun.join(", ")}`);
console.log(`Search: "${query}" in ${location}, mode: ${mode}`);
console.log(`Output dir: ${outDir}`);

for (const siteName of sitesToRun) {
  const recordDir = join(outDir, siteName, "html_samples");

  const browser = await createPlaywrightBrowser({ recordDir });
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
    for (let i = 0; i < sample.length; i++) {
      console.log(
        `[${siteName}] Fetching vacancy ${i + 1}/${sample.length}: ${sample[i]}`,
      );
      try {
        await site.getVacancyDetails(sample[i]);
      } catch (err) {
        console.error(`[${siteName}] Failed: ${sample[i]}`, err);
      }
    }

    console.log(`[${siteName}] Saved to ${recordDir}`);
  } finally {
    await browser.close();
  }
}

console.log("\nDone. Run: npm test");
