import { describe, expect, it } from "vitest"
import { resolveSecrets } from "."

describe("resolveSecrets", () => {
  it("returns an explicit secrets shape", () => {
    expect(resolveSecrets()).toEqual({
      openrouterApiKey: undefined,
      requestyApiKey: undefined,
      googleMapsApiKey: undefined,
    })
  })

  it("preserves provided values", () => {
    expect(resolveSecrets({ googleMapsApiKey: "maps-key" })).toEqual({
      openrouterApiKey: undefined,
      requestyApiKey: undefined,
      googleMapsApiKey: "maps-key",
    })
  })
})
