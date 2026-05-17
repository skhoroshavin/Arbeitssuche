import type { Fetch } from "@/plugins/fetch"
import { HttpStub } from "@/utils/index.js"

export class FetchStub extends HttpStub<StubRoute> {
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = resolveUrl(input)
    const route = this.get(url)
    if (route) {
      return Promise.resolve(
        Response.json(route.body, { status: route.status ?? 200 }),
      )
    }
    return Promise.resolve(new Response("Not Found", { status: 404 }))
  }
}

export interface StubRoute {
  body: unknown
  status?: number
}

function resolveUrl(
  input: string | URL | Request,
): string {
  if (typeof input === "string") {
    return input
  }
  if (input instanceof URL) {
    return input.toString()
  }
  return input.url
}
