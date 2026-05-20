import { z } from "zod"

export class Secrets {
  openrouterApiKey = ""
  requestyApiKey = ""
  googleMapsApiKey = ""

  static parse(data: unknown): Secrets {
    const parsed = SecretsInputSchema.parse(data)
    const secrets = new Secrets()
    secrets.openrouterApiKey = parsed.openrouterApiKey
    secrets.requestyApiKey = parsed.requestyApiKey
    secrets.googleMapsApiKey = parsed.googleMapsApiKey
    return secrets
  }
}

const SecretsInputSchema = z.object({
  openrouterApiKey: z.string().default(""),
  requestyApiKey: z.string().default(""),
  googleMapsApiKey: z.string().default(""),
})
