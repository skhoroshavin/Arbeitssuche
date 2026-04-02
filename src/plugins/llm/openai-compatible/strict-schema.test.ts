import { describe, it, expect } from "vitest";
import { toStrictSchema } from "./index";

describe("toStrictSchema", () => {
  it("inlines $ref and adds additionalProperties: false", () => {
    const input = {
      components: {
        schemas: {
          Foo: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      },
      schema: { $ref: "#/components/schemas/Foo" },
    };

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    });
  });

  it("converts oneOf with const values to enum", () => {
    const input = {
      components: { schemas: {} },
      schema: {
        type: "object",
        properties: {
          score: {
            oneOf: [{ const: "low" }, { const: "high" }],
          },
        },
        required: ["score"],
      },
    };

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        score: { type: "string", enum: ["low", "high"] },
      },
      required: ["score"],
      additionalProperties: false,
    });
  });

  it("converts optional properties to nullable and adds to required", () => {
    const input = {
      components: { schemas: {} },
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: [],
      },
    };

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        email: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: ["name", "email"],
      additionalProperties: false,
    });
  });

  it("converts oneOf type alternatives to anyOf", () => {
    const input = {
      components: {
        schemas: {
          Contact: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
        },
      },
      schema: {
        type: "object",
        properties: {
          contact: {
            oneOf: [{ type: "null" }, { $ref: "#/components/schemas/Contact" }],
          },
        },
        required: ["contact"],
      },
    };

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        contact: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["contact"],
      additionalProperties: false,
    });
  });

  it("handles array with $ref items", () => {
    const input = {
      components: {
        schemas: {
          Item: {
            type: "object",
            properties: { value: { type: "number" } },
            required: ["value"],
          },
        },
      },
      schema: {
        type: "array",
        items: { $ref: "#/components/schemas/Item" },
      },
    };

    expect(toStrictSchema(input)).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "number" } },
        required: ["value"],
        additionalProperties: false,
      },
    });
  });

  it("transforms typia AssessResult schema", () => {
    const input = {
      version: "3.1",
      components: {
        schemas: {
          AssessResult: {
            type: "object",
            properties: {
              summary: { type: "string" },
              matchScore: { $ref: "#/components/schemas/MatchScore" },
            },
            required: ["summary", "matchScore"],
          },
          MatchScore: {
            oneOf: [
              { const: "very-bad" },
              { const: "bad" },
              { const: "ok" },
              { const: "good" },
              { const: "excellent" },
            ],
          },
        },
      },
      schema: { $ref: "#/components/schemas/AssessResult" },
    };

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        summary: { type: "string" },
        matchScore: {
          type: "string",
          enum: ["very-bad", "bad", "ok", "good", "excellent"],
        },
      },
      required: ["summary", "matchScore"],
      additionalProperties: false,
    });
  });

  it("transforms typia ContactExtractionResult schema with optional fields", () => {
    const input = {
      version: "3.1",
      components: {
        schemas: {
          ContactExtractionResult: {
            type: "object",
            properties: {
              addresses: { type: "array", items: { type: "string" } },
              contact: {
                oneOf: [
                  { type: "null" },
                  { $ref: "#/components/schemas/VacancyContact" },
                ],
              },
            },
            required: ["addresses", "contact"],
          },
          VacancyContact: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
            },
            required: [],
          },
        },
      },
      schema: { $ref: "#/components/schemas/ContactExtractionResult" },
    };

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        addresses: { type: "array", items: { type: "string" } },
        contact: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: {
                name: { anyOf: [{ type: "string" }, { type: "null" }] },
                email: { anyOf: [{ type: "string" }, { type: "null" }] },
                phone: { anyOf: [{ type: "string" }, { type: "null" }] },
              },
              required: ["name", "email", "phone"],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["addresses", "contact"],
      additionalProperties: false,
    });
  });

  it("throws on unresolved $ref", () => {
    const input = {
      components: { schemas: {} },
      schema: { $ref: "#/components/schemas/Missing" },
    };

    expect(() => toStrictSchema(input)).toThrow("Unresolved $ref");
  });
});
