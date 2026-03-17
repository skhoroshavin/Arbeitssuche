import { useEffect, useRef, useState, useCallback } from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";

export type AutoSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T extends FieldValues> {
  control: Control<T>;
  onSave: (data: T) => Promise<unknown>;
  debounceMs?: number;
}

export function useAutoSave<T extends FieldValues>({
  control,
  onSave,
  debounceMs = 1000,
}: UseAutoSaveOptions<T>): {
  status: AutoSaveStatus;
  resetBaseline: () => void;
} {
  const values = useWatch({ control });
  const baselineRef = useRef<string | null>(null);
  const pendingBaselineRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const [status, setStatus] = useState<AutoSaveStatus>("idle");

  onSaveRef.current = onSave;

  const resetBaseline = useCallback(() => {
    pendingBaselineRef.current = true;
  }, []);

  const doSave = useCallback((data: T) => {
    baselineRef.current = JSON.stringify(data);
    setStatus("saving");
    onSaveRef.current(data).then(
      () => setStatus("saved"),
      () => setStatus("error"),
    );
  }, []);

  // Detect changes and debounce
  useEffect(() => {
    // Capture baseline from actual useWatch values after form.reset()
    if (pendingBaselineRef.current) {
      baselineRef.current = JSON.stringify(values);
      pendingBaselineRef.current = false;
      return;
    }

    if (baselineRef.current === null) return;

    const serialized = JSON.stringify(values);
    if (serialized === baselineRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setStatus((prev) => (prev === "unsaved" ? "idle" : prev));
      return;
    }

    setStatus("unsaved");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- useWatch returns partial type
      doSave(structuredClone(values) as T);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [values, debounceMs, doSave]);

  // Flush on unmount
  const valuesRef = useRef(values);
  valuesRef.current = values;
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (
        baselineRef.current !== null &&
        JSON.stringify(valuesRef.current) !== baselineRef.current
      ) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- useWatch returns partial type
        onSaveRef.current(structuredClone(valuesRef.current) as T);
      }
    };
  }, []);

  return { status, resetBaseline };
}
