import type { CommuteResult, CommuteClient } from "@/plugins/commute/types.js";

interface DistanceMatrixResponse {
  rows: {
    elements: {
      status: string;
      distance?: { text: string };
      duration?: { text: string };
    }[];
  }[];
  status: string;
}

function getNextWeekday(): Date {
  const now = new Date();
  const day = now.getDay();

  // Days until next Monday-Thursday (always a working day)
  let daysUntil = 1;
  if (day === 0)
    daysUntil = 1; // Sun -> Mon
  else if (day === 5)
    daysUntil = 3; // Fri -> Mon
  else if (day === 6) daysUntil = 2; // Sat -> Mon

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
): Promise<{ distance: string; duration: string }> {
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
  if (!element || element.status !== "OK") {
    throw new Error(
      `No route found for "${destination}": ${element?.status ?? "no data"}`,
    );
  }

  return {
    distance: element.distance!.text,
    duration: element.duration!.text,
  };
}

class GoogleMapsCommuteClient implements CommuteClient {
  constructor(private readonly apiKey: string) {}

  async getCommute(
    origin: string,
    destination: string,
  ): Promise<CommuteResult> {
    const nextWeekday = getNextWeekday();

    const [morning, day, evening] = await Promise.all([
      fetchDuration(
        origin,
        destination,
        this.apiKey,
        departureTimestamp(nextWeekday, 8),
      ),
      fetchDuration(
        origin,
        destination,
        this.apiKey,
        departureTimestamp(nextWeekday, 12),
      ),
      fetchDuration(
        origin,
        destination,
        this.apiKey,
        departureTimestamp(nextWeekday, 18),
      ),
    ]);

    return {
      distance: morning.distance,
      durations: {
        morning: morning.duration,
        day: day.duration,
        evening: evening.duration,
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}

export function createGoogleMapsCommuteClient(apiKey: string): CommuteClient {
  return new GoogleMapsCommuteClient(apiKey);
}
