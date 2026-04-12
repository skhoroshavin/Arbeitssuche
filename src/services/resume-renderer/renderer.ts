import Handlebars from "handlebars"
import fs from "node:fs"
import path from "node:path"

Handlebars.registerHelper("json", (value: unknown) => JSON.stringify(value))
Handlebars.registerHelper("join", (array: unknown, separator: unknown) =>
  Array.isArray(array) && typeof separator === "string"
    ? array.join(separator)
    : "",
)

export function renderHTML(
  directory: string,
  templateName: string,
  data: Record<string, unknown>,
): string {
  const templatePath = path.join(directory, `${templateName}.html`)
  const source = fs.readFileSync(templatePath, "utf8")
  return Handlebars.compile(source)(data)
}
