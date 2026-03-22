import type { Vacancy, VacancyContact } from "@/models/vacancy/types.js";
import type { JsonSchema, LlmClient } from "@/plugins/llm/types.js";

export interface ContactExtractionResult {
  addresses: string[];
  contact: VacancyContact | null;
}

const EXTRACT_CONTACT_MAX_TOKENS = 512;

const EXTRACT_CONTACT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    addresses: {
      type: "array",
      items: { type: "string" },
    },
    contact: {
      anyOf: [
        {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
          },
          additionalProperties: false,
        },
        { type: "null" },
      ],
    },
  },
  required: ["addresses", "contact"],
  additionalProperties: false,
};

export function needsContactExtraction(vacancy: Vacancy): boolean {
  if (!vacancy.description) return false;

  const hasEmptyAddresses = vacancy.addresses.length === 0;
  const hasPartialContact =
    !vacancy.contact ||
    !vacancy.contact.name ||
    !vacancy.contact.email ||
    !vacancy.contact.phone;

  return hasEmptyAddresses || hasPartialContact;
}

function buildContactExtractionPrompt(vacancy: Vacancy): string {
  const existingAddresses =
    vacancy.addresses.length > 0
      ? vacancy.addresses.join(", ")
      : "Keine vorhanden";

  const existingContact = vacancy.contact
    ? [
        vacancy.contact.name ? `Name: ${vacancy.contact.name}` : null,
        vacancy.contact.email ? `E-Mail: ${vacancy.contact.email}` : null,
        vacancy.contact.phone ? `Telefon: ${vacancy.contact.phone}` : null,
      ]
        .filter(Boolean)
        .join(", ") || "Keine vorhanden"
    : "Keine vorhanden";

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
- Einzelne Felder in contact dürfen weggelassen werden, wenn nicht vorhanden`;
}

const trimString = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

function parseAddresses(parsed: object): string[] {
  if (!("addresses" in parsed) || !Array.isArray(parsed.addresses)) return [];

  const addresses: string[] = [];
  for (const addr of parsed.addresses) {
    const trimmed = trimString(addr);
    if (trimmed) addresses.push(trimmed);
  }
  return addresses;
}

function parseContact(parsed: object): VacancyContact | null {
  if (
    !("contact" in parsed) ||
    !parsed.contact ||
    typeof parsed.contact !== "object"
  )
    return null;

  const c = parsed.contact;
  const name = trimString("name" in c ? c.name : undefined);
  const email = trimString("email" in c ? c.email : undefined);
  const phone = trimString("phone" in c ? c.phone : undefined);

  if (!name && !email && !phone) return null;

  const contact: VacancyContact = {};
  if (name) contact.name = name;
  if (email) contact.email = email;
  if (phone) contact.phone = phone;
  return contact;
}

function parseContactExtractionResult(
  parsed: unknown,
): ContactExtractionResult | null {
  if (!parsed || typeof parsed !== "object") return null;

  const addresses = parseAddresses(parsed);
  const contact = parseContact(parsed);

  if (addresses.length === 0 && !contact) return null;

  return { addresses, contact };
}

export async function extractContactInfo(
  vacancy: Vacancy,
  llmClient: LlmClient,
): Promise<ContactExtractionResult | null> {
  const prompt = buildContactExtractionPrompt(vacancy);
  const parsed = await llmClient.completeJSON(
    prompt,
    EXTRACT_CONTACT_MAX_TOKENS,
    EXTRACT_CONTACT_SCHEMA,
  );
  return parseContactExtractionResult(parsed);
}

export function mergeContactInfo(
  vacancy: Vacancy,
  extracted: ContactExtractionResult,
): Vacancy {
  let addresses = vacancy.addresses;

  if (extracted.addresses.length > 0) {
    const merged = [...vacancy.addresses];

    for (const newAddr of extracted.addresses) {
      const newLower = newAddr.toLowerCase();

      const existingIndex = merged.findIndex(
        (existing) =>
          existing.toLowerCase() !== newLower &&
          newLower.includes(existing.toLowerCase()),
      );

      if (existingIndex >= 0) {
        merged[existingIndex] = newAddr;
      } else {
        const alreadyCovered = merged.some(
          (existing) =>
            existing.toLowerCase() === newLower ||
            existing.toLowerCase().includes(newLower),
        );
        if (!alreadyCovered) {
          merged.push(newAddr);
        }
      }
    }

    addresses = merged;
  }

  let contact = vacancy.contact;
  if (extracted.contact) {
    contact = {
      ...vacancy.contact,
      ...extracted.contact,
    };
  }

  const addressesChanged =
    addresses.length !== vacancy.addresses.length ||
    addresses.some((a, i) => a !== vacancy.addresses[i]);
  const contactChanged = contact !== vacancy.contact;

  if (!addressesChanged && !contactChanged) return vacancy;

  return { ...vacancy, addresses, contact };
}
