import { z } from "zod"

export class Address {
  street = ""
  zip = ""
  city = ""

  static readonly schema = z.object({
    street: z.string().default(""),
    zip: z.string().default(""),
    city: z.string().default(""),
  })

  static parse(data: unknown): Address {
    const { street, zip, city } = Address.schema.parse(data)
    const address = new Address()
    address.street = street
    address.zip = zip
    address.city = city
    return address
  }

  format(): string {
    const parts: string[] = []
    if (this.street.trim()) {
      parts.push(this.street.trim())
    }
    const cityLine = [this.zip.trim(), this.city.trim()]
      .filter(Boolean)
      .join(" ")
    if (cityLine) {
      parts.push(cityLine)
    }
    return parts.join(", ")
  }

  isEmpty(): boolean {
    return (
      this.street.trim().length === 0 &&
      this.zip.trim().length === 0 &&
      this.city.trim().length === 0
    )
  }

  isValid(): boolean {
    return (
      this.street.trim().length > 0 &&
      this.zip.trim().length > 0 &&
      this.city.trim().length > 0
    )
  }
}
