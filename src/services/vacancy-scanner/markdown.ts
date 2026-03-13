import * as cheerio from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { isText, isTag } from "domhandler";

function convertNode(node: AnyNode, $: cheerio.CheerioAPI): string {
  if (isText(node)) {
    return node.data.replace(/\s+/g, " ");
  }
  if (!isTag(node)) return "";
  const tag = node.tagName.toLowerCase();
  const children = node.children
    .map((c: AnyNode) => convertNode(c, $))
    .join("");

  const headingMatch = tag.match(/^h([1-6])$/);
  if (headingMatch) {
    return `${"#".repeat(Number(headingMatch[1]))} ${children.trim()}\n\n`;
  }

  switch (tag) {
    case "p":
      return `${children.trim()}\n\n`;
    case "br":
      return "\n";
    case "strong":
    case "b":
      return `**${children.trim()}**`;
    case "em":
    case "i":
      return `_${children.trim()}_`;
    case "a": {
      const href = $(node).attr("href");
      return href ? `[${children.trim()}](${href})` : children.trim();
    }
    case "ul":
    case "ol":
      return `${children}\n`;
    case "li":
      return `-   ${children.trim()}\n`;
    default:
      return children;
  }
}

export function htmlToMarkdown(
  html: string | null | undefined,
): string | undefined {
  if (!html) return undefined;
  const $ = cheerio.load(html, undefined, false);
  const root = $.root()[0];
  const result = root.children
    .map((c: AnyNode) => convertNode(c, $))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return result || undefined;
}
