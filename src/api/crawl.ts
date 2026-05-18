import { z } from "zod"

const SiteInfoSchema = z.object({
  name: z.string(),
  supportedModes: z.array(z.string()),
})

export const SitesListResponseSchema = z.object({
  sites: z.array(SiteInfoSchema),
})
