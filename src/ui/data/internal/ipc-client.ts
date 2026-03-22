declare global {
  interface Window {
    electronAPI?: {
      invoke(channel: string, ...args: unknown[]): Promise<unknown>;
      on(channel: string, callback: (...args: unknown[]) => void): () => void;
    };
  }
}

interface RouteMapping {
  channel: string;
  extractArgs: (
    pathParts: string[],
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ) => unknown[];
}

type Route = { method: string; pattern: RegExp; mapping: RouteMapping };

function createProviderSecretRoutes(type: string): Route[] {
  return [
    {
      method: "GET",
      pattern: new RegExp(`^/settings/${type}/secrets$`),
      mapping: {
        channel: `settings:${type}:secrets`,
        extractArgs: () => [],
      },
    },
    {
      method: "PUT",
      pattern: new RegExp(`^/settings/${type}/([^/]+)/secret$`),
      mapping: {
        channel: `settings:${type}:secret:save`,
        extractArgs: (p, body) => [p[1], body?.value],
      },
    },
    {
      method: "DELETE",
      pattern: new RegExp(`^/settings/${type}/([^/]+)/secret$`),
      mapping: {
        channel: `settings:${type}:secret:clear`,
        extractArgs: (p) => [p[1]],
      },
    },
    {
      method: "POST",
      pattern: new RegExp(`^/settings/${type}/([^/]+)/secret/test$`),
      mapping: {
        channel: `settings:${type}:secret:test`,
        extractArgs: (p) => [p[1]],
      },
    },
  ];
}

// Map HTTP method + path pattern to IPC channel
const ROUTE_MAP: Route[] = [
  // Applicants
  {
    method: "GET",
    pattern: /^\/applicants$/,
    mapping: {
      channel: "applicants:list",
      extractArgs: () => [],
    },
  },
  {
    method: "POST",
    pattern: /^\/applicants$/,
    mapping: {
      channel: "applicants:create",
      extractArgs: (_p, body) => [body?.name],
    },
  },
  {
    method: "GET",
    pattern: /^\/applicants\/([^/]+)$/,
    mapping: {
      channel: "applicants:load",
      extractArgs: (p) => [p[1]],
    },
  },
  {
    method: "PUT",
    pattern: /^\/applicants\/([^/]+)$/,
    mapping: {
      channel: "applicants:save",
      extractArgs: (p, body) => [p[1], body],
    },
  },
  {
    method: "DELETE",
    pattern: /^\/applicants\/([^/]+)$/,
    mapping: {
      channel: "applicants:delete",
      extractArgs: (p) => [p[1]],
    },
  },
  // Applicant consultation
  {
    method: "POST",
    pattern: /^\/applicants\/([^/]+)\/consult-searches$/,
    mapping: {
      channel: "applicants:consult-searches",
      extractArgs: (p) => [p[1]],
    },
  },
  // Job searches
  {
    method: "GET",
    pattern: /^\/job-searches$/,
    mapping: {
      channel: "job-searches:list",
      extractArgs: (_p, _b, q) => [q?.applicantId],
    },
  },
  {
    method: "POST",
    pattern: /^\/job-searches$/,
    mapping: {
      channel: "job-searches:create",
      extractArgs: (_p, body) => [
        body?.searchTerm,
        body?.applicantId,
        body?.searchMode,
      ],
    },
  },
  {
    method: "GET",
    pattern: /^\/job-searches\/([^/]+)$/,
    mapping: {
      channel: "job-searches:load",
      extractArgs: (p) => [p[1]],
    },
  },
  {
    method: "PUT",
    pattern: /^\/job-searches\/([^/]+)$/,
    mapping: {
      channel: "job-searches:save",
      extractArgs: (p, body) => [p[1], body],
    },
  },
  {
    method: "DELETE",
    pattern: /^\/job-searches\/([^/]+)$/,
    mapping: {
      channel: "job-searches:delete",
      extractArgs: (p) => [p[1]],
    },
  },
  // Cover letter
  {
    method: "GET",
    pattern: /^\/job-searches\/([^/]+)\/cover-letter$/,
    mapping: {
      channel: "job-searches:cover-letter:load",
      extractArgs: (p) => [p[1]],
    },
  },
  {
    method: "PUT",
    pattern: /^\/job-searches\/([^/]+)\/cover-letter$/,
    mapping: {
      channel: "job-searches:cover-letter:save",
      extractArgs: (p, body) => [p[1], body?.content],
    },
  },
  {
    method: "POST",
    pattern: /^\/job-searches\/([^/]+)\/cover-letter\/generate$/,
    mapping: {
      channel: "job-searches:cover-letter:generate",
      extractArgs: (p) => [p[1]],
    },
  },
  // Vacancies
  {
    method: "GET",
    pattern: /^\/job-searches\/([^/]+)\/vacancies$/,
    mapping: {
      channel: "job-searches:vacancies:list",
      extractArgs: (p) => [p[1]],
    },
  },
  {
    method: "PUT",
    pattern: /^\/job-searches\/([^/]+)\/vacancies$/,
    mapping: {
      channel: "job-searches:vacancies:seed",
      extractArgs: (p, body) => [p[1], body?.vacancies, body?.latestCrawl],
    },
  },
  {
    method: "GET",
    pattern: /^\/job-searches\/([^/]+)\/vacancies\/([^/]+)$/,
    mapping: {
      channel: "job-searches:vacancies:load",
      extractArgs: (p) => [p[1], p[2]],
    },
  },
  {
    method: "POST",
    pattern: /^\/job-searches\/([^/]+)\/vacancies\/([^/]+)\/activities$/,
    mapping: {
      channel: "job-searches:vacancies:add-activity",
      extractArgs: (p, body) => [p[1], p[2], body],
    },
  },
  // Vacancy cover letter
  {
    method: "GET",
    pattern: /^\/job-searches\/([^/]+)\/vacancies\/([^/]+)\/cover-letter$/,
    mapping: {
      channel: "job-searches:vacancies:cover-letter:load",
      extractArgs: (p) => [p[1], p[2]],
    },
  },
  {
    method: "PUT",
    pattern: /^\/job-searches\/([^/]+)\/vacancies\/([^/]+)\/cover-letter$/,
    mapping: {
      channel: "job-searches:vacancies:cover-letter:save",
      extractArgs: (p, body) => [p[1], p[2], body?.content],
    },
  },
  {
    method: "POST",
    pattern:
      /^\/job-searches\/([^/]+)\/vacancies\/([^/]+)\/cover-letter\/generate$/,
    mapping: {
      channel: "job-searches:vacancies:cover-letter:generate",
      extractArgs: (p) => [p[1], p[2]],
    },
  },
  // Crawl
  {
    method: "POST",
    pattern: /^\/job-searches\/([^/]+)\/crawls$/,
    mapping: {
      channel: "job-searches:crawl:start",
      extractArgs: (p) => [p[1]],
    },
  },
  {
    method: "DELETE",
    pattern: /^\/job-searches\/([^/]+)\/crawls\/active$/,
    mapping: {
      channel: "job-searches:crawl:abort",
      extractArgs: (p) => [p[1]],
    },
  },
  // Sites
  {
    method: "GET",
    pattern: /^\/sites$/,
    mapping: {
      channel: "sites:list",
      extractArgs: () => [],
    },
  },
  // Settings: Provider secrets (LLM + Commute)
  ...createProviderSecretRoutes("llm"),
  ...createProviderSecretRoutes("commute"),
  // Settings: Provider info
  {
    method: "GET",
    pattern: /^\/settings\/llm-providers$/,
    mapping: {
      channel: "settings:llm-providers",
      extractArgs: () => [],
    },
  },
  {
    method: "GET",
    pattern: /^\/settings\/commute-providers$/,
    mapping: {
      channel: "settings:commute-providers",
      extractArgs: () => [],
    },
  },
  // LLM models
  {
    method: "GET",
    pattern: /^\/settings\/llm-models$/,
    mapping: {
      channel: "settings:llm-models",
      extractArgs: () => [],
    },
  },
  // Config (non-secret settings)
  {
    method: "GET",
    pattern: /^\/settings\/config$/,
    mapping: {
      channel: "settings:config:load",
      extractArgs: () => [],
    },
  },
  {
    method: "PUT",
    pattern: /^\/settings\/config\/([^/]+)$/,
    mapping: {
      channel: "settings:config:save",
      extractArgs: (p, body) => [p[1], body?.value],
    },
  },
];

export async function ipcFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (query[k] = v));

  let body: Record<string, unknown> | undefined;
  if (init?.body && typeof init.body === "string") {
    body = JSON.parse(init.body);
  }

  for (const route of ROUTE_MAP) {
    if (route.method !== method) continue;
    const match = pathname.match(route.pattern);
    if (!match) continue;

    const parts = Array.from(match);
    const args = route.mapping.extractArgs(parts, body, query);

    const result = await window.electronAPI!.invoke(
      route.mapping.channel,
      ...args,
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- IPC trust boundary
    return result as T;
  }

  throw new Error(`No IPC mapping for ${method} ${pathname}`);
}
