import type { Fetch } from "@/plugins/fetch/types.js";

interface StubRoute {
  body: unknown;
  status?: number;
}

interface StubFetch extends Fetch {
  requestedUrls: string[];
}

export function createStubFetch(routes: Record<string, StubRoute>): StubFetch {
  const requestedUrls: string[] = [];

  const stubFetch: StubFetch = Object.assign(
    async (url: string, _init?: RequestInit): Promise<Response> => {
      requestedUrls.push(url);
      for (const [pattern, route] of Object.entries(routes)) {
        if (url.includes(pattern)) {
          return new Response(JSON.stringify(route.body), {
            status: route.status ?? 200,
          });
        }
      }
      return new Response("Not Found", { status: 404 });
    },
    { requestedUrls },
  );

  return stubFetch;
}
