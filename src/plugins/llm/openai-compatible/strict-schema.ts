/**
 * Transforms a typia json.schema() output into OpenAI strict-mode-compatible format:
 * - Inlines $ref references
 * - Adds additionalProperties: false to all objects
 * - Makes optional properties nullable and required
 * - Converts oneOf with const values to enum
 * - Converts remaining oneOf to anyOf (OpenAI strict mode uses anyOf)
 */
export function toStrictSchema(typiaOutput: object): Record<string, unknown> {
  if (!isRecord(typiaOutput)) throw new Error("Invalid schema input");

  const components = typiaOutput.components;
  const schemas =
    isRecord(components) && isRecord(components.schemas)
      ? components.schemas
      : {};

  if (!isRecord(typiaOutput.schema)) {
    throw new Error("Invalid schema: missing root schema");
  }

  return resolve(typiaOutput.schema, schemas);
}

function resolve(
  node: Record<string, unknown>,
  definitions: Definitions,
): Record<string, unknown> {
  if (typeof node.$ref === "string") {
    return resolveReference(node.$ref, definitions);
  }

  const result = resolveChildren(node, definitions);
  makeStrictObject(result);
  return result;
}

function resolveChildren(
  node: Record<string, unknown>,
  definitions: Definitions,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    const handler = CHILD_HANDLERS[key];
    const handled = handler ? handler(value, definitions, result) : false;
    if (!handled) result[key] = value;
  }
  return result;
}

const CHILD_HANDLERS: Partial<Record<string, ChildHandler>> = {
  oneOf: (value, defs, result) => {
    if (!isRecordArray(value)) return false;
    resolveOneOf(value, defs, result);
    return true;
  },
  anyOf: (value, defs, result) => {
    if (!isRecordArray(value)) return false;
    result.anyOf = value.map((v) => resolve(v, defs));
    return true;
  },
  items: (value, defs, result) => {
    if (!isRecord(value)) return false;
    result.items = resolve(value, defs);
    return true;
  },
  properties: (value, defs, result) => {
    if (!isRecord(value)) return false;
    result.properties = resolveProperties(value, defs);
    return true;
  },
};

function makeStrictObject(result: Record<string, unknown>): void {
  if (result.type !== "object" || !isRecord(result.properties)) return;

  const required = isStringArray(result.required) ? result.required : [];
  const allProperties = Object.keys(result.properties);
  const optional = allProperties.filter((p) => !required.includes(p));

  if (optional.length > 0) {
    const properties = result.properties;
    for (const property of optional) {
      properties[property] = {
        anyOf: [properties[property], { type: "null" }],
      };
    }
    result.required = allProperties;
  }

  result.additionalProperties = false;
}

function resolveOneOf(
  value: Record<string, unknown>[],
  definitions: Definitions,
  result: Record<string, unknown>,
): void {
  if (isConstEnum(value)) {
    result.type = "string";
    result.enum = value.map((v) => v.const);
  } else {
    result.anyOf = value.map((v) => resolve(v, definitions));
  }
}

function resolveReference(
  reference: string,
  definitions: Definitions,
): Record<string, unknown> {
  const name = reference.replace("#/components/schemas/", "");
  const definition = definitions[name];
  if (!isRecord(definition)) throw new Error(`Unresolved $ref: ${reference}`);
  return resolve({ ...definition }, definitions);
}

function resolveProperties(
  value: Record<string, unknown>,
  definitions: Definitions,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [propertyName, propertySchema] of Object.entries(value)) {
    properties[propertyName] = isRecord(propertySchema)
      ? resolve(propertySchema, definitions)
      : propertySchema;
  }
  return properties;
}

type ChildHandler = (
  value: unknown,
  definitions: Definitions,
  result: Record<string, unknown>,
) => boolean;

type Definitions = Record<string, unknown>;

function isRecordArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isRecord);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isConstEnum(
  items: Record<string, unknown>[],
): items is Array<{ const: unknown }> {
  return items.every((v) => "const" in v);
}
