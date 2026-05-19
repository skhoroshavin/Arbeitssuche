import { z } from "zod"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyContact } from "@/models/vacancy"
import type { LlmClient, TypedSchema } from "@/plugins/llm"
import { mergeAddresses } from "@/services/vacancy-processor/index.js"

export function needsContactExtraction(vacancy: Vacancy): boolean {
  if (!vacancy.description) return false

  const hasEmptyAddresses = vacancy.addresses.length === 0
  const contact = vacancy.contact
  const hasPartialContact =
    contact.name.trim().length === 0 ||
    contact.email.trim().length === 0 ||
    contact.phone.trim().length === 0

  return hasEmptyAddresses || hasPartialContact
}

export async function extractContactInfo(
  vacancy: Vacancy,
  llmClient: LlmClient,
  signal?: AbortSignal,
): Promise<ContactExtractionResult | undefined> {
  const prompt = buildContactExtractionPrompt(vacancy)
  const raw = await llmClient.completeJSON(
    prompt,
    512,
    EXTRACT_CONTACT_SCHEMA,
    signal,
  )

  const addresses = raw.addresses.map((s) => s.trim()).filter(Boolean)
  const contact = cleanContact(raw.contact)

  if (addresses.length === 0 && !hasContact(contact)) return undefined
  return { addresses, contact }
}

export function mergeContactInfo(
  vacancy: Vacancy,
  extracted: ContactExtractionResult,
): Vacancy {
  const addresses =
    extracted.addresses.length > 0
      ? mergeAddresses(vacancy.addresses, extracted.addresses)
      : vacancy.addresses

  const contact = hasContact(extracted.contact)
    ? { ...vacancy.contact, ...extracted.contact }
    : vacancy.contact

  const addressesChanged =
    addresses.length !== vacancy.addresses.length ||
    addresses.some((a, index) => a !== vacancy.addresses[index])

  if (!addressesChanged && contact === vacancy.contact) return vacancy
  return vacancy.with({ addresses, contact })
}

interface ContactExtractionResult {
  addresses: string[]
  contact: VacancyContact
}

const RawContactSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
})

const RawContactResultSchema = z.object({
  addresses: z.array(z.string()),
  contact: RawContactSchema.nullable(),
})
type RawContactResult = z.infer<typeof RawContactResultSchema>

const EXTRACT_CONTACT_SCHEMA: TypedSchema<RawContactResult> = {
  schema: z.toJSONSchema(RawContactResultSchema),
  parse: (input: string) => RawContactResultSchema.parse(JSON.parse(input)),
}

function buildContactExtractionPrompt(vacancy: Vacancy): string {
  const existingAddresses =
    vacancy.addresses.length > 0
      ? vacancy.addresses.join(", ")
      : "Keine vorhanden"

  const contact = vacancy.contact
  const existingContact =
    [
      contact.name.trim().length > 0 ? `Name: ${contact.name}` : undefined,
      contact.email.trim().length > 0 ? `E-Mail: ${contact.email}` : undefined,
      contact.phone.trim().length > 0 ? `Telefon: ${contact.phone}` : undefined,
    ]
      .filter(Boolean)
      .join(", ") || "Keine vorhanden"

  return `Extrahieren Sie die Adress- und Kontaktdaten aus der folgenden Stellenausschreibung.

## Stellenausschreibung
Titel: ${vacancy.title}
Unternehmen: ${vacancy.company}

## Bereits bekannte Daten
Adressen: ${existingAddresses}
Kontakt: ${existingContact}

## Beschreibung
${vacancy.description}

Geben Sie NUR ein JSON-Objekt zurück (keine Markdown-Fences, kein zusätzlicher Text):
{"addresses": ["Vollständige Adresse 1"], "contact": {"name": "Ansprechpartner", "email": "email@example.com", "phone": "+49..."}}

Regeln:
- Geben Sie nur Adressen/Kontaktdaten an, die tatsächlich im Text vorkommen
- Wenn keine Adresse/kein Kontakt gefunden wird, geben Sie leere Arrays bzw. null zurück
- Bevorzugen Sie vollständige Adressen (Straße, PLZ, Stadt) gegenüber nur Stadtnamen
- contact darf null sein, wenn keine Kontaktdaten gefunden werden
- Einzelne Felder in contact dürfen weggelassen werden, wenn nicht vorhanden`
}

function cleanContact(
  contact: z.infer<typeof RawContactSchema> | null,
): VacancyContact {
  if (!contact) return { name: "", email: "", phone: "" }
  return {
    name: trimOrEmpty(contact.name),
    email: trimOrEmpty(contact.email),
    phone: trimOrEmpty(contact.phone),
  }
}

function trimOrEmpty(value?: string | null): string {
  return value?.trim() ?? ""
}

function hasContact(contact: VacancyContact): boolean {
  return (
    contact.name.trim().length > 0 ||
    contact.email.trim().length > 0 ||
    contact.phone.trim().length > 0
  )
}
