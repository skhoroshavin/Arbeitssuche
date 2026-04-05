import type { Fetch } from "@/plugins/fetch/types.js"
import { findStubMatch } from "@/utils/stub-utilities.js"

export function createStubFetch(routes: Record<string, StubRoute>): StubFetch {
  const requestedUrls: string[] = []

  const stubFetch: StubFetch = Object.assign(
    (url: string, _init?: RequestInit): Promise<Response> => {
      requestedUrls.push(url)
      const route = findStubMatch(routes, url)
      if (route) {
        return Promise.resolve(
          Response.json(route.body, {
            status: route.status ?? 200,
          }),
        )
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }))
    },
    { requestedUrls },
  )

  return stubFetch
}

interface StubRoute {
  body: unknown
  status?: number
}

interface StubFetch extends Fetch {
  requestedUrls: string[]
}
