export class HttpStub<T> {
  private readonly entries = new Map<string, T>()
  readonly requestedUrls: string[] = []

  set(urlPattern: string, response: T): this {
    this.entries.set(urlPattern, response)
    return this
  }

  get(url: string): T | undefined {
    this.requestedUrls.push(url)
    if (this.entries.has(url)) {
      return this.entries.get(url)
    }
    for (const [urlPattern, response] of this.entries) {
      if (url.includes(urlPattern)) {
        return response
      }
    }
    return undefined
  }
}

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
