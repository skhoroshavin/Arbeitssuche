import type { CommuteResult, CommuteClient } from "@/plugins/commute/types.js";

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
