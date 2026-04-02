import { useEffect, useRef, useState, useCallback } from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";

export type AutoSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export function useAutoSave<T extends FieldValues>({
  control,
  onSave,
  debounceMs = 1000,
}: UseAutoSaveOptions<T>): {
  status: AutoSaveStatus;
  resetBaseline: () => void;
} {
  const values = useWatch({ control, compute: (v) => v });
  const baselineReference = useRef<string | undefined>(undefined);
  const pendingBaselineReference = useRef(false);
  const timerReference = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onSaveReference = useRef(onSave);
  const [status, setStatus] = useState<AutoSaveStatus>("idle");

  onSaveReference.current = onSave;

  const resetBaseline = useCallback(() => {
    pendingBaselineReference.current = true;
  }, []);

  const doSave = useCallback((data: T) => {
    baselineReference.current = JSON.stringify(data);
    setStatus("saving");
    onSaveReference.current(data).then(
      () => setStatus("saved"),
      () => setStatus("error"),
    );
  }, []);

  // Detect changes and debounce
  useEffect(() => {
    // Capture baseline from actual useWatch values after form.reset()
    if (pendingBaselineReference.current) {
      baselineReference.current = JSON.stringify(values);
      pendingBaselineReference.current = false;
      return;
    }

    if (baselineReference.current === undefined) return;

    const serialized = JSON.stringify(values);
    if (serialized === baselineReference.current) {
      if (timerReference.current) {
        clearTimeout(timerReference.current);
        timerReference.current = undefined;
      }
      setStatus((previous) => (previous === "unsaved" ? "idle" : previous));
      return;
    }

    setStatus("unsaved");

    if (timerReference.current) clearTimeout(timerReference.current);
    timerReference.current = setTimeout(() => {
      timerReference.current = undefined;
      doSave(structuredClone(values));
    }, debounceMs);

    return () => {
      if (timerReference.current) {
        clearTimeout(timerReference.current);
        timerReference.current = undefined;
      }
    };
  }, [values, debounceMs, doSave]);

  // Flush on unmount
  const valuesReference = useRef(values);
  valuesReference.current = values;
  useEffect(() => {
    return () => {
      if (timerReference.current) {
        clearTimeout(timerReference.current);
        timerReference.current = undefined;
      }
      if (
        baselineReference.current !== undefined &&
        JSON.stringify(valuesReference.current) !== baselineReference.current
      ) {
        void onSaveReference.current(structuredClone(valuesReference.current));
      }
    };
  }, []);

  return { status, resetBaseline };
}

interface UseAutoSaveOptions<T extends FieldValues> {
  control: Control<T>;
  onSave: (data: T) => Promise<unknown>;
  debounceMs?: number;
}
