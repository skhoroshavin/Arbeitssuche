import { useState, useCallback } from "react";
import { useSaveSecret, useClearSecret } from "@/ui/data/settings";
import { useEscapeKey } from "@/ui/hooks";
import type { SecretKey } from "@/models/secrets/types";

interface SecretFieldProps {
  label: string;
  secretKey: SecretKey;
  masked: string;
  isSet: boolean;
}

export function SecretField({
  label,
  secretKey,
  masked,
  isSet,
}: SecretFieldProps) {
  const [mode, setMode] = useState<"display" | "editing">("display");
  const [inputValue, setInputValue] = useState("");
  const saveSecret = useSaveSecret();
  const clearSecret = useClearSecret();

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    await saveSecret.mutateAsync({ key: secretKey, value: inputValue.trim() });
    setInputValue("");
    setMode("display");
  };

  const handleCancel = useCallback(() => {
    setInputValue("");
    setMode("display");
  }, []);

  const handleClear = async () => {
    await clearSecret.mutateAsync(secretKey);
  };

  const handleStartEditing = () => {
    setInputValue("");
    setMode("editing");
  };

  useEscapeKey(handleCancel);

  return (
    <div>
      {mode === "display" ? (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 font-mono border border-gray-200 dark:border-gray-700 rounded">
            {isSet ? masked : "Nicht gesetzt"}
          </span>
          <div className="flex gap-2 ml-auto">
            {isSet ? (
              <>
                <button
                  type="button"
                  aria-label={`${label} ersetzen`}
                  onClick={handleStartEditing}
                  className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Ersetzen
                </button>
                <button
                  type="button"
                  aria-label={`${label} löschen`}
                  onClick={handleClear}
                  disabled={clearSecret.isPending}
                  className="px-3 py-1 text-xs font-medium rounded border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  Löschen
                </button>
              </>
            ) : (
              <button
                type="button"
                aria-label={`${label} hinzufügen`}
                onClick={handleStartEditing}
                className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Hinzufügen
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label={label}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            aria-label={`${label} speichern`}
            onClick={handleSave}
            disabled={!inputValue.trim() || saveSecret.isPending}
            className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Speichern
          </button>
          <button
            type="button"
            aria-label={`${label} abbrechen`}
            onClick={handleCancel}
            className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}
