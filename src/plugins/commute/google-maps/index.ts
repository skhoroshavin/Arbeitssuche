import type {
  CommuteResult,
  CommuteClient,
  CommuteProviderInfo,
} from "@/plugins/commute/types.js";

interface DistanceMatrixResponse {
  rows: {
    elements: {
      status: string;
      distance?: { text: string };
      duration?: { value: number };
    }[];
  }[];
  status: string;
}

function getNextWeekday(): Date {
  const now = new Date();
  const day = now.getDay();

  let daysUntil = 1;
  if (day === 0) daysUntil = 1;
  else if (day === 5) daysUntil = 3;
  else if (day === 6) daysUntil = 2;

  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next;
}

function departureTimestamp(baseDate: Date, hour: number): number {
  const d = new Date(baseDate);
  d.setHours(hour, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

async function fetchDuration(
  origin: string,
  destination: string,
  apiKey: string,
  departureTime: number,
): Promise<{ distance: string; durationMinutes: number }> {
  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "transit",
    departure_time: String(departureTime),
    key: apiKey,
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!res.ok) {
    throw new Error(
      `Distance Matrix API error: ${res.status} ${res.statusText}`,
    );
  }

  const data: DistanceMatrixResponse = await res.json();

  if (data.status !== "OK") {
    throw new Error(`Distance Matrix API status: ${data.status}`);
  }

  const element = data.rows[0]?.elements[0];
  if (
    !element ||
    element.status !== "OK" ||
    !element.distance ||
    !element.duration
  ) {
    throw new Error(
      `No route found for "${destination}": ${element?.status ?? "no data"}`,
    );
  }

  return {
    distance: element.distance.text,
    durationMinutes: Math.round(element.duration.value / 60),
  };
}

export const googleMapsProviderInfo: CommuteProviderInfo = {
  id: "google-maps",
  name: "Google Maps",
  instructions: [
    "1. \u00d6ffne die [Google Cloud Console](https://console.cloud.google.com)",
    "2. Erstelle ein [neues Projekt](https://console.cloud.google.com/projectcreate) oder w\u00e4hle ein bestehendes aus",
    "3. Aktiviere die [Abrechnung](https://console.cloud.google.com/billing) f\u00fcr das Projekt (erforderlich f\u00fcr API-Zugriff)",
    "4. \u00d6ffne die [API-Bibliothek](https://console.cloud.google.com/apis/library) und suche nach \u201EDistance Matrix API\u201C",
    "5. Klicke auf [Distance Matrix API](https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com) \u2192 \u201EAktivieren\u201C",
    "6. Gehe zu [Anmeldedaten](https://console.cloud.google.com/apis/credentials) \u2192 \u201EAnmeldedaten erstellen\u201C \u2192 \u201EAPI-Schl\u00fcssel\u201C",
    "7. Klicke auf \u201ESchl\u00fcssel einschr\u00e4nken\u201C und w\u00e4hle unter \u201EAPI-Einschr\u00e4nkungen\u201C nur die Distance Matrix API",
    "8. Kopiere den Schl\u00fcssel \u2014 er beginnt mit `AIza\u2026`",
    "9. F\u00fcge ihn oben ein",
  ].join("\n"),
};

class GoogleMapsCommuteClient implements CommuteClient {
  constructor(private readonly apiKey: string) {}

  async getCommute(
    origin: string,
    destination: string,
  ): Promise<CommuteResult> {
    const nextWeekday = getNextWeekday();
    const atHour = (hour: number) =>
      fetchDuration(
        origin,
        destination,
        this.apiKey,
        departureTimestamp(nextWeekday, hour),
      );

    const [morning, day, evening] = await Promise.all([
      atHour(8),
      atHour(12),
      atHour(18),
    ]);

    return {
      distance: morning.distance,
      durations: {
        morning: morning.durationMinutes,
        day: day.durationMinutes,
        evening: evening.durationMinutes,
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}

export function createGoogleMapsCommuteClient(apiKey: string): CommuteClient {
  return new GoogleMapsCommuteClient(apiKey);
}
