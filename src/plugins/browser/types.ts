export interface OpenPageOptions {
  waitFor?: string
  blockPatterns?: RegExp[]
}

export interface Page {
  html: string
  navigate(url: string, options?: { waitFor?: string }): Promise<void>
  close(): Promise<void>
}

export interface Browser {
  openPage(url: string, options?: OpenPageOptions): Promise<Page>
  close(): Promise<void>
}
