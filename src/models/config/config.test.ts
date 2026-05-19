import { describe, expect, it } from "vitest"
import { Config } from "@/models/config"

describe("Config", () => {
  it("default constructor produces default values", () => {
    const c = new Config()
    expect(c.provider).toBe("openrouter")
    expect(c.assessmentModel).toBe("google/gemini-2.5-flash")
    expect(c.coverLetterModel).toBe("anthropic/claude-opus-4")
    expect(c.consultationModel).toBe("google/gemini-2.5-flash")
  })

  it("parse fills missing fields with defaults", () => {
    const c = Config.parse({})
    expect(c.provider).toBe("openrouter")
    expect(c.assessmentModel).toBe("google/gemini-2.5-flash")
    expect(c.coverLetterModel).toBe("anthropic/claude-opus-4")
    expect(c.consultationModel).toBe("google/gemini-2.5-flash")
  })

  it("parse preserves provided values", () => {
    const c = Config.parse({
      provider: "requesty",
      assessmentModel: "test/model",
      coverLetterModel: "test/cover",
      consultationModel: "test/consult",
    })
    expect(c.provider).toBe("requesty")
    expect(c.assessmentModel).toBe("test/model")
    expect(c.coverLetterModel).toBe("test/cover")
    expect(c.consultationModel).toBe("test/consult")
  })
})
