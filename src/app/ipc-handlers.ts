import { ipcMain, type WebContents } from "electron";
import type { AppServices } from "./index.js";
import type { Applicant } from "@/models/applicant/types.js";
import type { JobSearch, SearchMode } from "@/models/job-search/types.js";
import type { Activity } from "@/models/vacancy/types.js";
import type { Vacancy } from "@/models/vacancy/vacancy.js";
import type { Secrets, SecretKey } from "@/models/secrets/types.js";
import type { ConfigKey } from "@/models/config/types.js";
import { resolveConfig } from "@/models/config/resolve.js";
import { getJobSiteInfos } from "@/plugins/job-site/index.js";
import { getLlmProviders } from "@/plugins/llm/index.js";
import { getCommuteProviders } from "@/plugins/commute/index.js";
import { startCrawl, abortCrawl } from "./crawl-manager.js";

async function testBearerKey(
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  await res.text();
  if (!res.ok)
    return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
  return { ok: true };
}

function maskToken(token: string | undefined): string {
  if (!token) return "";
  if (token.length <= 8)
    return token.slice(0, 2) + "••••••••" + token.slice(-2);
  return token.slice(0, 4) + "••••••••" + token.slice(-4);
}

interface IpcHandlerOptions {
  services: AppServices;
  getWebContents: () => WebContents | undefined;
}

export function registerIpcHandlers(options: IpcHandlerOptions): void {
  const { services, getWebContents } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handle<F extends (...args: any[]) => unknown>(
    channel: string,
    handler: F,
  ): void {
    ipcMain.handle(channel, async (_event, ...args) => {
      return handler(...args);
    });
  }

  // --- Applicants ---
  handle("applicants:list", () => ({
    applicants: services.applicantRepo.list(),
  }));
  handle("applicants:create", (name: string) => {
    const id = services.applicantRepo.create(name);
    return { id };
  });
  handle("applicants:load", (id: string) => services.applicantRepo.load(id));
  handle("applicants:save", async (id: string, data: Applicant) => {
    await services.applicantRepo.save(id, data);
    return { ok: true };
  });
  handle("applicants:delete", (id: string) => {
    services.applicantRepo.delete(id);
    return { deleted: id };
  });
  handle("applicants:resume", (id: string, template: string) =>
    services.resumeRenderer.generate(id, template),
  );
  handle("applicants:consult-searches", (id: string) =>
    services.jobConsultant.consult(id),
  );

  // --- Job Searches ---
  handle("job-searches:list", (applicantId: string | undefined) => {
    const list = applicantId
      ? services.jobSearchRepo.listByApplicant(applicantId)
      : services.jobSearchRepo.list();
    return { jobSearches: list };
  });
  handle(
    "job-searches:create",
    (
      searchTerm: string,
      applicantId: string,
      searchMode: SearchMode | undefined,
    ) => {
      const id = services.jobSearchRepo.create(
        searchTerm,
        applicantId,
        searchMode,
      );
      return { id, applicantId };
    },
  );
  handle("job-searches:load", (id: string) => services.jobSearchRepo.load(id));
  handle("job-searches:save", async (id: string, data: JobSearch) => {
    await services.jobSearchRepo.save(id, data);
    return { ok: true };
  });
  handle("job-searches:delete", (id: string) => {
    services.jobSearchRepo.delete(id);
    return { deleted: id };
  });

  // --- Cover letter ---
  handle("job-searches:cover-letter:load", (id: string) => {
    const content = services.jobSearchRepo.loadCoverLetter(id);
    return { content: content ?? "" };
  });
  handle(
    "job-searches:cover-letter:save",
    async (id: string, content: string) => {
      await services.jobSearchRepo.saveCoverLetter(id, content);
      return { ok: true };
    },
  );
  handle("job-searches:cover-letter:generate", (id: string) =>
    services.coverLetterWriter.generate(id),
  );

  // --- Vacancies ---
  handle("job-searches:vacancies:list", (id: string) => {
    const output = services.vacancyRepo.loadAll(id);
    if (!output) {
      return { vacancies: [], totalCount: 0 };
    }
    const vacancies = output.vacancies.map((v) => ({
      ...v,
      status: v.deriveStatus(),
      sources: v.deriveSources(),
    }));
    return {
      vacancies,
      totalCount: vacancies.length,
      generatedAt: output.generatedAt,
      latestCrawl: output.latestCrawl,
    };
  });
  handle(
    "job-searches:vacancies:seed",
    (id: string, vacancies: Vacancy[], latestCrawl: string) => {
      services.vacancyRepo.save(
        id,
        vacancies,
        latestCrawl ?? new Date().toISOString().slice(0, 10),
      );
      return { ok: true as const, count: vacancies.length };
    },
  );
  handle("job-searches:vacancies:load", (id: string, hash: string) => {
    const vacancy = services.vacancyRepo.findByHash(id, hash);
    if (!vacancy) {
      throw new Error(`Vacancy "${hash}" not found`);
    }
    return {
      ...vacancy,
      status: vacancy.deriveStatus(),
      sources: vacancy.deriveSources(),
    };
  });
  handle(
    "job-searches:vacancies:add-activity",
    async (id: string, hash: string, activity: Activity) => {
      await services.vacancyRepo.addActivity(id, hash, activity);
      return { ok: true };
    },
  );

  // --- Vacancy cover letter ---
  handle(
    "job-searches:vacancies:cover-letter:load",
    (id: string, hash: string) => {
      const content = services.jobSearchRepo.loadApplicationCoverLetter(
        id,
        hash,
      );
      return { content: content ?? "" };
    },
  );
  handle(
    "job-searches:vacancies:cover-letter:save",
    async (id: string, hash: string, content: string) => {
      await services.jobSearchRepo.saveApplicationCoverLetter(
        id,
        hash,
        content,
      );
      return { ok: true };
    },
  );
  handle(
    "job-searches:vacancies:cover-letter:generate",
    (id: string, hash: string) =>
      services.coverLetterWriter.generateForVacancy(id, hash),
  );

  // --- Crawl ---
  handle("job-searches:crawl:start", (id: string) => {
    const webContents = getWebContents();

    startCrawl({
      jobSearchId: id,
      vacancyScanner: services.vacancyScanner,
      onProgress: (event) => {
        webContents?.send("job:progress", { jobSearchId: id, ...event });
      },
      onComplete: () => {
        webContents?.send("job:progress", {
          jobSearchId: id,
          message: "Crawl finished",
          phase: "done",
        });
      },
      onError: (err) => {
        webContents?.send("job:progress", {
          jobSearchId: id,
          message: `Crawl error: ${err.message}`,
          phase: "done",
        });
      },
    });
  });

  handle("job-searches:crawl:abort", (id: string) => {
    abortCrawl(id);
    return { aborted: true };
  });

  // --- Sites ---
  handle("sites:list", () => ({ sites: getJobSiteInfos() }));

  // --- Provider ID → SecretKey mapping ---
  const LLM_SECRET_KEYS: Record<string, SecretKey> = {
    openrouter: "openrouterApiKey",
    requesty: "requestyApiKey",
  };
  const COMMUTE_SECRET_KEYS: Record<string, SecretKey> = {
    "google-maps": "googleMapsApiKey",
  };

  function maskedSecretsFor(
    mapping: Record<string, SecretKey>,
  ): Record<string, { masked: string; isSet: boolean }> {
    const secrets = services.secretsRepo.load();
    const result: Record<string, { masked: string; isSet: boolean }> = {};
    for (const [providerId, key] of Object.entries(mapping)) {
      const value = secrets[key];
      result[providerId] = { masked: maskToken(value), isSet: !!value };
    }
    return result;
  }

  function resolveSecretKey(
    providerId: string,
    mapping: Record<string, SecretKey>,
  ): SecretKey {
    const key = mapping[providerId];
    if (!key) throw new Error(`Unknown provider: ${providerId}`);
    return key;
  }

  async function saveProviderSecret(
    providerId: string,
    value: string,
    mapping: Record<string, SecretKey>,
  ): Promise<{ ok: true }> {
    const key = resolveSecretKey(providerId, mapping);
    const secrets = services.secretsRepo.load();
    secrets[key] = value;
    await services.secretsRepo.save(secrets);
    services.rebuild();
    return { ok: true };
  }

  async function clearProviderSecret(
    providerId: string,
    mapping: Record<string, SecretKey>,
  ): Promise<{ ok: true }> {
    const key = resolveSecretKey(providerId, mapping);
    const secrets = services.secretsRepo.load();
    delete secrets[key];
    await services.secretsRepo.save(secrets);
    services.rebuild();
    return { ok: true };
  }

  // --- Settings: LLM secrets ---
  handle("settings:llm:secrets", () => maskedSecretsFor(LLM_SECRET_KEYS));
  handle(
    "settings:llm:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(providerId, value, LLM_SECRET_KEYS),
  );
  handle("settings:llm:secret:clear", async (providerId: string) =>
    clearProviderSecret(providerId, LLM_SECRET_KEYS),
  );
  handle("settings:llm:secret:test", async (providerId: string) => {
    const key = resolveSecretKey(providerId, LLM_SECRET_KEYS);
    const secrets = services.secretsRepo.load();
    const value = secrets[key];
    if (!value) return { ok: false, error: "Kein Schlüssel gesetzt" };
    try {
      switch (providerId) {
        case "openrouter":
          return testBearerKey("https://openrouter.ai/api/v1/auth/key", value);
        case "requesty":
          return testBearerKey(
            "https://router.eu.requesty.ai/v1/models",
            value,
          );
        default:
          return { ok: false, error: "Unbekannter Anbieter" };
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // --- Settings: Commute secrets ---
  handle("settings:commute:secrets", () =>
    maskedSecretsFor(COMMUTE_SECRET_KEYS),
  );
  handle(
    "settings:commute:secret:save",
    async (providerId: string, value: string) =>
      saveProviderSecret(providerId, value, COMMUTE_SECRET_KEYS),
  );
  handle("settings:commute:secret:clear", async (providerId: string) =>
    clearProviderSecret(providerId, COMMUTE_SECRET_KEYS),
  );
  handle("settings:commute:secret:test", async (providerId: string) => {
    const key = resolveSecretKey(providerId, COMMUTE_SECRET_KEYS);
    const secrets = services.secretsRepo.load();
    const value = secrets[key];
    if (!value) return { ok: false, error: "Kein Schlüssel gesetzt" };
    try {
      switch (providerId) {
        case "google-maps": {
          const url = `https://maps.googleapis.com/maps/api/directions/json?origin=Berlin&destination=Berlin&mode=transit&key=${value}`;
          const res = await fetch(url, {
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) {
            await res.text();
            return {
              ok: false,
              error: `HTTP ${res.status}: ${res.statusText}`,
            };
          }
          const data: { status: string } = await res.json();
          if (data.status !== "OK")
            return { ok: false, error: `API-Status: ${data.status}` };
          return { ok: true };
        }
        default:
          return { ok: false, error: "Unbekannter Anbieter" };
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // --- Provider info ---
  handle("settings:llm-providers", () => getLlmProviders());
  handle("settings:commute-providers", () => getCommuteProviders());

  // --- E2E test helpers ---
  if (process.env.ELECTRON_TEST === "1") {
    handle("settings:secrets:load-raw", () => services.secretsRepo.load());
  }
  handle("settings:secrets:save", async (data: Secrets) => {
    await services.secretsRepo.save(data);
    services.rebuild();
    return { ok: true };
  });

  // --- LLM models ---
  handle("settings:llm-models", () => services.modelRegistry.fetchModels());

  // --- Config (non-secret settings) ---
  handle("settings:config:load", () =>
    resolveConfig(services.configRepo.load()),
  );
  handle("settings:config:save", async (key: ConfigKey, value: string) => {
    const config = services.configRepo.load();
    if (key === "provider") {
      config.provider = value === "requesty" ? "requesty" : "openrouter";
    } else {
      config[key] = value;
    }
    await services.configRepo.save(config);
    services.rebuild();
    return { ok: true };
  });
}
