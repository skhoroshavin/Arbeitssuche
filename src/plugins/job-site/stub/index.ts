import type {
  VacancyDetails,
  JobSite,
  SearchMode,
  VacancyListPage,
} from "@/plugins/job-site/types.js";

export interface StubJobSite extends JobSite {
  callLog: string[];
}

export interface StubJobSiteOptions {
  name?: string;
  supportedModes?: SearchMode[];
  pages?: Map<string | undefined, { urls: string[]; nextPageId?: string }>;
  vacancyMap?: Map<string, VacancyDetails>;
  errors?: Map<string, Error>;
}

class StubJobSiteImpl implements StubJobSite {
  readonly name: string;
  readonly supportedModes: SearchMode[];
  readonly callLog: string[] = [];

  private readonly pages?: Map<
    string | undefined,
    { urls: string[]; nextPageId?: string }
  >;
  private readonly vacancyMap?: Map<string, VacancyDetails>;
  private readonly errors?: Map<string, Error>;

  constructor(options: StubJobSiteOptions) {
    this.name = options.name ?? "stub";
    this.supportedModes = options.supportedModes ?? [
      "employment",
      "entry-level",
      "apprenticeship",
    ];
    this.pages = options.pages;
    this.vacancyMap = options.vacancyMap;
    this.errors = options.errors;
  }

  async getVacancyList(
    _criteria: unknown,
    pageId?: string,
  ): Promise<VacancyListPage> {
    this.callLog.push(`list:${pageId ?? "1"}`);
    if (this.pages) {
      return this.pages.get(pageId) ?? { urls: [], nextPageId: undefined };
    }
    return { urls: [], nextPageId: undefined };
  }

  async getVacancyDetails(url: string): Promise<VacancyDetails> {
    this.callLog.push(`details:${url}`);
    const error = this.errors?.get(url);
    if (error) throw error;
    return this.vacancyMap?.get(url) ?? { url };
  }
}

export function createStubJobSite(options?: StubJobSiteOptions): StubJobSite {
  return new StubJobSiteImpl(options ?? {});
}
