import { HttpStub } from "@/utils/index.js"

export class FetchStub extends HttpStub<StubRoute> {
  fetch(input: string | URL | Request, _init?: RequestInit): Promise<Response> {
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

interface StubRoute {
  body: unknown
  status?: number
}

function resolveUrl(input: string | URL | Request): string {
  if (input instanceof Request) {
    return input.url
  }
  return input.toString()
}
