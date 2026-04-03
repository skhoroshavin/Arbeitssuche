import typia from "typia"
import type { Vacancy } from "@/models/vacancy/index.js"
import type { VacancyContact } from "@/models/vacancy/types.js"
import type { LlmClient, TypedSchema } from "@/plugins/llm/types.js"
import { mergeAddresses } from "@/services/vacancy-processor/index.js"

export function needsContactExtraction(vacancy: Vacancy): boolean {
  if (!vacancy.description) return false

  const hasEmptyAddresses = vacancy.addresses.length === 0
  const contact = vacancy.contact
  const hasPartialContact = !contact.name || !contact.email || !contact.phone

  return hasEmptyAddresses || hasPartialContact
}

export async function extractContactInfo(
  vacancy: Vacancy,
  llmClient: LlmClient,
): Promise<ContactExtractionResult | undefined> {
  const prompt = buildContactExtractionPrompt(vacancy)
  const raw = await llmClient.completeJSON(
    prompt,
    EXTRACT_CONTACT_MAX_TOKENS,
    EXTRACT_CONTACT_SCHEMA,
  )

  const addresses = raw.addresses.map((s) => s.trim()).filter(Boolean)
  const contact = cleanContact(raw.contact)

  if (addresses.length === 0 && !contact) return undefined
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

  const contact = extracted.contact
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
  contact?: VacancyContact
}

const EXTRACT_CONTACT_MAX_TOKENS = 512

const EXTRACT_CONTACT_SCHEMA: TypedSchema<RawContactResult> = {
  schema: typia.json.schema<RawContactResult>(),
  parse: typia.json.createAssertParse<RawContactResult>(),
}

// Raw type matching the LLM JSON contract: contact is nullable in the JSON schema
interface RawContactResult {
  addresses: string[]
  contact: VacancyContact | null
}

function buildContactExtractionPrompt(vacancy: Vacancy): string {
  const existingAddresses =
    vacancy.addresses.length > 0
      ? vacancy.addresses.join(", ")
      : "Keine vorhanden"

  const contact = vacancy.contact
  const existingContact =
    [
      contact.name ? `Name: ${contact.name}` : undefined,
      contact.email ? `E-Mail: ${contact.email}` : undefined,
      contact.phone ? `Telefon: ${contact.phone}` : undefined,
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
  contact: VacancyContact | null,
): VacancyContact | undefined {
  if (!contact) return undefined
  const cleaned = pickDefined({
    name: trimOrUndefined(contact.name),
    email: trimOrUndefined(contact.email),
    phone: trimOrUndefined(contact.phone),
  })
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

function trimOrUndefined(value?: string): string | undefined {
  return value?.trim() || undefined
}

function pickDefined(
  object: Record<string, string | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(object)) {
    if (value) result[key] = value
  }
  return result
}
