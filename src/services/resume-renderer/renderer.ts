import fs from "node:fs";
import path from "node:path";

export const templatesDir = path.resolve(
  import.meta.dirname ?? __dirname,
  "./templates",
);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object";
}

function resolve(obj: unknown, keyPath: string): unknown {
  let cur: unknown = obj;
  for (const key of keyPath.split(".")) {
    if (!isRecord(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function renderTemplate(source: string, data: unknown): string {
  let result = "";
  let i = 0;

  while (i < source.length) {
    const open = source.indexOf("{{", i);
    if (open === -1) {
      result += source.slice(i);
      break;
    }
    result += source.slice(i, open);
    const close = source.indexOf("}}", open);
    if (close === -1) {
      result += source.slice(open);
      break;
    }

    const tag = source.slice(open + 2, close).trim();
    i = close + 2;

    if (tag.startsWith("#if ")) {
      const key = tag.slice(4).trim();
      const endTag = `{{/if}}`;
      const endIdx = findMatchingEnd(source, i, "if");
      const block = source.slice(i, endIdx);
      i = endIdx + endTag.length;
      const val = resolve(data, key);
      if (val && (!Array.isArray(val) || val.length > 0)) {
        result += renderTemplate(block, data);
      }
    } else if (tag.startsWith("#each ")) {
      const key = tag.slice(6).trim();
      const endTag = `{{/each}}`;
      const endIdx = findMatchingEnd(source, i, "each");
      const block = source.slice(i, endIdx);
      i = endIdx + endTag.length;
      const arr = resolve(data, key);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const itemData =
            typeof item === "object" && item !== null
              ? { ...item, this: item }
              : { this: item };
          result += renderTemplate(block, itemData);
        }
      }
    } else if (tag.startsWith("/")) {
      // closing tag — should not reach here
    } else if (tag.startsWith("join ")) {
      const args = tag.slice(5).trim();
      const match = args.match(/^(\S+)\s+"([^"]*)"$/);
      if (match) {
        const arr = resolve(data, match[1]);
        if (Array.isArray(arr)) {
          result += escapeHtml(arr.join(match[2]));
        }
      }
    } else if (tag.startsWith("json ")) {
      const key = tag.slice(5).trim();
      const val = resolve(data, key);
      result += escapeHtml(JSON.stringify(val));
    } else if (tag === "this") {
      const val = isRecord(data) ? data["this"] : undefined;
      if (val != null) result += escapeHtml(String(val));
    } else {
      // Simple variable
      const val = resolve(data, tag);
      if (val != null) result += escapeHtml(String(val));
    }
  }

  return result;
}

function findMatchingEnd(source: string, start: number, type: string): number {
  const openPattern = `{{#${type} `;
  const closePattern = `{{/${type}}}`;
  let depth = 1;
  let pos = start;
  while (pos < source.length && depth > 0) {
    const nextOpen = source.indexOf(openPattern, pos);
    const nextClose = source.indexOf(closePattern, pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + openPattern.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      pos = nextClose + closePattern.length;
    }
  }
  return source.length;
}

export function renderHTML(
  dir: string,
  templateName: string,
  data: unknown,
): string {
  const templatePath = path.join(dir, `${templateName}.html`);
  const source = fs.readFileSync(templatePath, "utf-8");
  return renderTemplate(source, data);
}
