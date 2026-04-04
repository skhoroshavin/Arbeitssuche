import TurndownService from "turndown"

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim()
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
})
