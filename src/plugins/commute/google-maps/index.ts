import typia from "typia"
import type {
  CommuteResult,
  CommuteClient,
  CommuteProviderInfo,
} from "@/plugins/commute/types.js"

export const googleMapsProviderInfo: CommuteProviderInfo = {
  id: "google-maps",
  name: "Google Maps",
  instructions: [
    "1. Öffne die [Google Cloud Console](https://console.cloud.google.com)",
    "2. Erstelle ein [neues Projekt](https://console.cloud.google.com/projectcreate) oder wähle ein bestehendes aus",
    "3. Aktiviere die [Abrechnung](https://console.cloud.google.com/billing) für das Projekt (erforderlich für API-Zugriff)",
    '4. Öffne die [API-Bibliothek](https://console.cloud.google.com/apis/library) und suche nach "Distance Matrix API"',
    '5. Klicke auf [Distance Matrix API](https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com) → "Aktivieren"',
    '6. Gehe zu [Anmeldedaten](https://console.cloud.google.com/apis/credentials) → "Anmeldedaten erstellen" → "API-Schlüssel"',
    '7. Klicke auf "Schlüssel einschränken" und wähle unter "API-Einschränkungen" nur die Distance Matrix API',
    "8. Kopiere den Schlüssel - er beginnt mit `AIza...`",
    "9. Füge ihn oben ein",
  ].join("\n"),
}

export function createGoogleMapsCommuteClient(apiKey: string): CommuteClient {
  return new GoogleMapsCommuteClient(apiKey)
}

class GoogleMapsCommuteClient implements CommuteClient {
  constructor(private readonly apiKey: string) {}

  async getCommute(
    origin: string,
    destination: string,
  ): Promise<CommuteResult> {
    const nextWeekday = getNextWeekday()
    const atHour = (hour: number) =>
      fetchDuration(
        origin,
        destination,
        this.apiKey,
        departureTimestamp(nextWeekday, hour),
      )

    const [morning, day, evening] = await Promise.all([
      atHour(8),
      atHour(12),
      atHour(18),
    ])

    return {
      distance: morning.distance,
      durations: {
        morning: morning.durationMinutes,
        day: day.durationMinutes,
        evening: evening.durationMinutes,
      },
      fetchedAt: new Date().toISOString(),
    }
  }

  async ping(): Promise<boolean> {
    const GOOGLE_MAPS_OK_STATUSES = new Set(["OK", "ZERO_RESULTS"])
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=Berlin&destination=Berlin&mode=transit&key=${this.apiKey}`
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) {
      await response.text()
      return false
    }
    const data = typia.json.assertParse<{ status: string }>(
      await response.text(),
    )
    return GOOGLE_MAPS_OK_STATUSES.has(data.status)
  }
}

async function fetchDuration(
  origin: string,
  destination: string,
  apiKey: string,
  departureTime: number,
): Promise<{ distance: string; durationMinutes: number }> {
  const parameters = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "transit",
    departure_time: String(departureTime),
    key: apiKey,
  })

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${parameters}`
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })

  if (!response.ok) {
    throw new Error(
      `Distance Matrix API error: ${response.status} ${response.statusText}`,
    )
  }

  const data = typia.json.assertParse<DistanceMatrixResponse>(
    await response.text(),
  )

  if (data.status !== "OK") {
    throw new Error(`Distance Matrix API status: ${data.status}`)
  }

  return parseRouteElement(data, destination)
}

function parseRouteElement(
  data: DistanceMatrixResponse,
  destination: string,
): { distance: string; durationMinutes: number } {
  const element = data.rows[0].elements[0]
  if (element.status !== "OK" || !element.distance || !element.duration) {
    throw new Error(`No route found for "${destination}": ${element.status}`)
  }
  return {
    distance: element.distance.text,
    durationMinutes: Math.round(element.duration.value / 60),
  }
}

function getNextWeekday(): Date {
  const now = new Date()
  //                    Sun Mon Tue Wed Thu Fri Sat
  const DAYS_UNTIL_MON = [1, 1, 1, 1, 1, 3, 2] as const
  const daysUntil = DAYS_UNTIL_MON[now.getDay()]

  const next = new Date(now)
  next.setDate(now.getDate() + daysUntil)
  next.setHours(0, 0, 0, 0)
  return next
}

function departureTimestamp(baseDate: Date, hour: number): number {
  const d = new Date(baseDate)
  d.setHours(hour, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

interface DistanceMatrixResponse {
  rows: { elements: DistanceMatrixElement[] }[]
  status: string
}

interface DistanceMatrixElement {
  status: string
  distance?: { text: string }
  duration?: { value: number }
}
