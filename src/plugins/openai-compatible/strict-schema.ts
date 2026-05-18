/**
 * Transforms a JSON Schema into OpenAI strict-mode-compatible format:
 * - Adds additionalProperties: false to all objects
 * - Makes optional properties nullable and required
 * - Converts oneOf with const values to enum (defensive)
 * - Converts remaining oneOf to anyOf (OpenAI strict mode uses anyOf)
 */
export function toStrictSchema(input: object): Record<string, unknown> {
  if (!isRecord(input)) throw new Error("Invalid schema input")
  return resolve(input)
}

function resolve(node: Record<string, unknown>): Record<string, unknown> {
  const result = resolveChildren(node)
  makeStrictObject(result)
  return result
}

function resolveChildren(
  node: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    const handler = CHILD_HANDLERS[key]
    const handled = handler ? handler(value, result) : false
    if (!handled) result[key] = value
  }
  return result
}

const CHILD_HANDLERS: Partial<Record<string, ChildHandler>> = {
  oneOf: (value, result) => {
    if (!isRecordArray(value)) return false
    resolveOneOf(value, result)
    return true
  },
  anyOf: (value, result) => {
    if (!isRecordArray(value)) return false
    result.anyOf = value.map((v) => (isRecord(v) ? resolve(v) : v))
    return true
  },
  items: (value, result) => {
    if (!isRecord(value)) return false
    result.items = resolve(value)
    return true
  },
  properties: (value, result) => {
    if (!isRecord(value)) return false
    result.properties = resolveProperties(value)
    return true
  },
}

function makeStrictObject(result: Record<string, unknown>): void {
  if (result.type !== "object") return
  const properties = result.properties
  if (!isRecord(properties)) return

  const allPropertyNames = Object.keys(properties)
  const optional = getOptionalPropertyNames(result, allPropertyNames)

  if (optional.length > 0) {
    for (const name of optional) {
      const existing = properties[name]
      if (!hasNullAnyOfIfRecord(existing)) {
        properties[name] = {
          anyOf: [existing, { type: "null" }],
        }
      }
    }
  }
  result.required = allPropertyNames
  result.additionalProperties = false
}

function getOptionalPropertyNames(
  result: Record<string, unknown>,
  allPropertyNames: string[],
): string[] {
  const required = isStringArray(result.required) ? [...result.required] : []
  return allPropertyNames.filter((name) => !required.includes(name))
}

function hasNullAnyOfIfRecord(existing: unknown): boolean {
  return isRecord(existing) && hasNullAnyOf(existing)
}

function hasNullAnyOf(schema: Record<string, unknown>): boolean {
  const anyOf = schema.anyOf
  if (!Array.isArray(anyOf)) return false
  return anyOf.some((entry) => isRecord(entry) && entry.type === "null")
}

function resolveOneOf(
  value: Record<string, unknown>[],
  result: Record<string, unknown>,
): void {
  if (isConstEnum(value)) {
    result.type = "string"
    result.enum = value.map((entry) => entry.const)
  } else {
    result.anyOf = value.map((entry) => resolve(entry))
  }
}

function resolveProperties(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  for (const [propertyName, propertySchema] of Object.entries(value)) {
    properties[propertyName] = isRecord(propertySchema)
      ? resolve(propertySchema)
      : propertySchema
  }
  return properties
}

type ChildHandler = (value: unknown, result: Record<string, unknown>) => boolean

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isRecord)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  )
}

function isConstEnum(
  items: Record<string, unknown>[],
): items is Array<{ const: unknown }> {
  return items.every((entry) => "const" in entry)
}
