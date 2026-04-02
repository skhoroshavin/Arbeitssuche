import { useState, useEffect, useCallback } from "react";
import typia from "typia";
import type { ProgressEvent } from "@/models/events.js";

export function useJobProgress(jobSearchId?: string) {
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

    if (!electronAPI) return;
    const api = electronAPI;
    const cleanup = api.on("job:progress", (data: unknown) => {
      if (!typia.is<ProgressPayload>(data)) return;
      if (data.jobSearchId && data.jobSearchId !== jobSearchId) return;

      if (data.vacanciesUpdated) {
        setVacancyUpdateCount((c) => c + 1);
      }

      const event: ProgressEvent = {
        message: data.message,
        phase: data.phase,
      };
      // Skip empty progress messages (used only for vacanciesUpdated signal)
      if (!event.message) return;
      setEvents((previous) =>
        previous.length >= 500
          ? [...previous.slice(-250), event]
          : [...previous, event],
      );
      if (event.phase === "done") {
        setDone(true);
      }
    });
    return cleanup;
  }, [jobSearchId]);

  return { events, done, reset, vacancyUpdateCount };
}

interface ProgressPayload extends ProgressEvent {
  jobSearchId?: string;
}
