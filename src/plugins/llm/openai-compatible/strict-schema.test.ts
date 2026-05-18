import { describe, it, expect } from "vitest"
import { toStrictSchema } from "."

describe("toStrictSchema", () => {
  it("adds additionalProperties: false to object", () => {
    const input = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: false,
    })
  })

  it("converts oneOf with const values to enum (defensive)", () => {
    const input = {
      type: "object",
      properties: {
        score: {
          oneOf: [{ const: "low" }, { const: "high" }],
        },
      },
      required: ["score"],
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        score: { type: "string", enum: ["low", "high"] },
      },
      required: ["score"],
      additionalProperties: false,
    })
  })

  it("converts optional properties to nullable and adds to required", () => {
    const input = {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
      },
      required: [],
    }

    expect(toStrictSchema(input)).toEqual({
      type: "object",
      properties: {
        name: { anyOf: [{ type: "string" }, { type: "null" }] },
        email: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: ["name", "email"],
      additionalProperties: false,
    })
  })

  it("converts oneOf type alternatives to anyOf", () => {
    const input = {
      type: "object",
      properties: {
        contact: {
          oneOf: [
            { type: "null" },
            {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          ],
        },
      },
      required: ["contact"],
    }

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
    })
  })

  it("handles array with inline items", () => {
    const input = {
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "number" } },
        required: ["value"],
      },
    }

    expect(toStrictSchema(input)).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "number" } },
        required: ["value"],
        additionalProperties: false,
      },
    })
  })

  it("transforms Zod AssessResult schema (enum, no optional)", () => {
    const input = {
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
    }

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
    })
  })

  it("transforms Zod ContactExtractionResult schema with optional nullable contact", () => {
    const input = {
      type: "object",
      properties: {
        addresses: { type: "array", items: { type: "string" } },
        contact: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              properties: {
                name: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                email: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                phone: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
              },
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["addresses"],
      additionalProperties: false,
    }

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
                name: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                email: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                phone: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
              },
              required: ["name", "email", "phone"],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["addresses", "contact"],
      additionalProperties: false,
    })
  })

  it("throws on invalid input", () => {
    // @ts-expect-error -- deliberate invalid input to test guard
    expect(() => toStrictSchema("not an object")).toThrow(
      "Invalid schema input",
    )
  })
})
