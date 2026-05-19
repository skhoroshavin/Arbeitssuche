import { z } from "zod"

export class Secrets {
  openrouterApiKey?: string
  requestyApiKey?: string
  googleMapsApiKey?: string

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
  openrouterApiKey: z.string().optional(),
  requestyApiKey: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
})
