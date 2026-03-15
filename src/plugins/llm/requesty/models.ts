import type { LlmModelRegistry } from "@/plugins/llm/types.js";
import { createModelRegistry } from "@/plugins/llm/openai-compatible/models.js";

function deriveModelName(id: string): string {
  const slash = id.indexOf("/");
  const base = slash >= 0 ? id.slice(slash + 1) : id;
  const atSign = base.indexOf("@");
  const withoutRegion = atSign >= 0 ? base.slice(0, atSign) : base;
  const parts = withoutRegion.split("-");
  const result: string[] = [];
  for (const part of parts) {
    const isNumeric = /^\d/.test(part);
    const lastIsNumeric =
      result.length > 0 && /^\d/.test(result[result.length - 1]!);
    if (isNumeric && lastIsNumeric) {
      result[result.length - 1] += `.${part}`;
    } else {
      result.push(part.charAt(0).toUpperCase() + part.slice(1));
    }
  }
  return result.join(" ");
}

export function createRequestyModelRegistry(): LlmModelRegistry {
  return createModelRegistry(
    "https://router.eu.requesty.ai/v1/models",
    (m) => ({
      id: String(m.id),
      name: typeof m.name === "string" ? m.name : deriveModelName(String(m.id)),
      pricing: {
        prompt: String(m.input_price ?? "0"),
        completion: String(m.output_price ?? "0"),
      },
    }),
  );
}
