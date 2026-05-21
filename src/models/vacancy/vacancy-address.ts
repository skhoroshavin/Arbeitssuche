import { z } from "zod"

import { Address } from "@/models/common"

export const CommuteInfoSchema = z.object({
  distance: z.string(),
  durations: z.object({
    morning: z.number(),
    day: z.number(),
    evening: z.number(),
  }),
  fetchedAt: z.string(),
})

export class VacancyAddress extends Address {
  commute?: CommuteInfo

  static fromString(value: string): VacancyAddress {
    const addr = new VacancyAddress()
    addr.street = value
    addr.zip = ""
    addr.city = ""
    return addr
  }

  static parse(data: unknown): VacancyAddress {
    const parsed = VacancyAddressSchema.parse(data)
    const addr = new VacancyAddress()
    addr.street = parsed.street
    addr.zip = parsed.zip
    addr.city = parsed.city
    addr.commute = parsed.commute
    return addr
  }
}

export interface CommuteInfo {
  distance: string
  durations: CommuteDurations
  fetchedAt: string
}

interface CommuteDurations {
  morning: number
  day: number
  evening: number
}

const VacancyAddressSchema = z.object({
  street: z.string().default(""),
  zip: z.string().default(""),
  city: z.string().default(""),
  commute: CommuteInfoSchema.optional(),
})
