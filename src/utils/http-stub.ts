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
