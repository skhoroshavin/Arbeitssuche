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

interface TagResult {
  text: string;
  nextIndex: number;
}

function extractBlock(
  source: string,
  i: number,
  type: string,
): { block: string; nextIndex: number } {
  const endIdx = findMatchingEnd(source, i, type);
  return {
    block: source.slice(i, endIdx),
    nextIndex: endIdx + `{{/${type}}}`.length,
  };
}

function handleIf(
  source: string,
  i: number,
  tag: string,
  data: unknown,
): TagResult {
  const key = tag.slice(4).trim();
  const { block, nextIndex } = extractBlock(source, i, "if");
  const val = resolve(data, key);
  const text =
    val && (!Array.isArray(val) || val.length > 0)
      ? renderTemplate(block, data)
      : "";
  return { text, nextIndex };
}

function handleEach(
  source: string,
  i: number,
  tag: string,
  data: unknown,
): TagResult {
  const key = tag.slice(6).trim();
  const { block, nextIndex } = extractBlock(source, i, "each");
  const arr = resolve(data, key);
  let text = "";
  if (Array.isArray(arr)) {
    for (const item of arr) {
      const itemData =
        typeof item === "object" && item !== null
          ? { ...item, this: item }
          : { this: item };
      text += renderTemplate(block, itemData);
    }
  }
  return { text, nextIndex };
}

function handleJoin(tag: string, data: unknown): string {
  const args = tag.slice(5).trim();
  const match = args.match(/^(\S+)\s+"([^"]*)"$/);
  if (match) {
    const arr = resolve(data, match[1]);
    if (Array.isArray(arr)) {
      return escapeHtml(arr.join(match[2]));
    }
  }
  return "";
}

function handleJson(tag: string, data: unknown): string {
  const key = tag.slice(5).trim();
  const val = resolve(data, key);
  return escapeHtml(JSON.stringify(val));
}

function handleThis(data: unknown): string {
  const val = isRecord(data) ? data["this"] : undefined;
  return val != null ? escapeHtml(String(val)) : "";
}

function handleVariable(tag: string, data: unknown): string {
  const val = resolve(data, tag);
  return val != null ? escapeHtml(String(val)) : "";
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
      const r = handleIf(source, i, tag, data);
      result += r.text;
      i = r.nextIndex;
    } else if (tag.startsWith("#each ")) {
      const r = handleEach(source, i, tag, data);
      result += r.text;
      i = r.nextIndex;
    } else if (tag.startsWith("/")) {
      // closing tag — should not reach here
    } else if (tag.startsWith("join ")) {
      result += handleJoin(tag, data);
    } else if (tag.startsWith("json ")) {
      result += handleJson(tag, data);
    } else if (tag === "this") {
      result += handleThis(data);
    } else {
      result += handleVariable(tag, data);
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
