import { useState, useEffect, useCallback } from "react";
import type { ProgressEvent } from "@/models/events.js";

export type { ProgressEvent };

interface ProgressPayload extends ProgressEvent {
  jobSearchId?: string;
}

function isProgressPayload(data: unknown): data is ProgressPayload {
  return !!data && typeof data === "object" && "message" in data;
}

export function useJobProgress(jobSearchId: string | undefined) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [done, setDone] = useState(false);
  const [vacancyUpdateCount, setVacancyUpdateCount] = useState(0);

  const reset = useCallback(() => {
    setEvents([]);
    setDone(false);
    setVacancyUpdateCount(0);
  }, []);

  useEffect(() => {
    if (!jobSearchId) return;
    setDone(false);

    const cleanup = window.electronAPI!.on("job:progress", (data: unknown) => {
      if (!isProgressPayload(data)) return;
      if (data.jobSearchId && data.jobSearchId !== jobSearchId) return;

      if (data.vacanciesUpdated) {
        setVacancyUpdateCount((c) => c + 1);
      }

      const event: ProgressEvent = {
        message: data.message,
        phase: data.phase,
        current: data.current,
        total: data.total,
      };
      // Skip empty progress messages (used only for vacanciesUpdated signal)
      if (!event.message) return;
      setEvents((prev) =>
        prev.length >= 500 ? [...prev.slice(-250), event] : [...prev, event],
      );
      if (event.phase === "done") {
        setDone(true);
      }
    });
    return cleanup;
  }, [jobSearchId]);

  return { events, done, reset, vacancyUpdateCount };
}
