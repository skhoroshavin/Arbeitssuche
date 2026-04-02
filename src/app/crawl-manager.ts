import type {
  VacancyScanner,
  OnProgress,
} from "@/services/vacancy-scanner/index.js";
import { createJobSite } from "@/plugins/job-site/index.js";
import { createElectronBrowser } from "@/plugins/browser/index.js";

export function startCrawl(options: StartCrawlOptions): void {
  const { jobSearchId, vacancyScanner, onProgress, onComplete, onError } =
    options;

  if (activeCrawls.has(jobSearchId)) {
    onError(new Error(`Crawl already running for ${jobSearchId}`));
    return;
  }

  const abortController = new AbortController();
  activeCrawls.set(jobSearchId, abortController);
  const browser = createElectronBrowser();

  vacancyScanner
    .scan(jobSearchId, abortController, onProgress, (name) =>
      createJobSite(name, browser),
    )
    .then(() => onComplete())
    .catch((error) =>
      onError(error instanceof Error ? error : new Error(String(error))),
    )
    .finally(async () => {
      activeCrawls.delete(jobSearchId);
      await browser.close();
    });
}

export function abortCrawl(jobSearchId: string): boolean {
  const controller = activeCrawls.get(jobSearchId);
  if (!controller) return false;

  controller.abort();
  return true;
}

const activeCrawls = new Map<string, AbortController>();

interface StartCrawlOptions {
  jobSearchId: string;
  vacancyScanner: VacancyScanner;
  onProgress: OnProgress;
  onComplete: () => void;
  onError: (error: Error) => void;
}
