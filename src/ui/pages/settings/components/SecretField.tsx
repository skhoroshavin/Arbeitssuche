import { useState, useCallback } from "react";
import { useEscapeKey } from "@/ui/hooks";

interface SecretFieldProps {
  label: string;
  masked: string;
  isSet: boolean;
  onSave: (value: string) => Promise<void>;
  onClear: () => Promise<void>;
  onTest: () => Promise<{ ok: boolean; error?: string }>;
}

export function SecretField({
  label,
  masked,
  isSet,
  onSave,
  onClear,
  onTest,
}: SecretFieldProps) {
  const [mode, setMode] = useState<"display" | "editing">("display");
  const [inputValue, setInputValue] = useState("");
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    setIsSaving(true);
    try {
      await onSave(inputValue.trim());
      setInputValue("");
      setMode("display");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    setInputValue("");
    setMode("display");
  }, []);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await onClear();
      setTestResult(null);
    } finally {
      setIsClearing(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    setIsTesting(true);
    try {
      const result = await onTest();
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleStartEditing = () => {
    setInputValue("");
    setMode("editing");
  };

  useEscapeKey(handleCancel);

  return (
    <div>
      {mode === "display" ? (
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 font-mono border border-gray-200 dark:border-gray-700 rounded">
              {isSet ? masked : "Nicht gesetzt"}
            </span>
            <div className="flex gap-2 ml-auto">
              {isSet ? (
                <>
                  <button
                    type="button"
                    aria-label={`${label} testen`}
                    onClick={handleTest}
                    disabled={isTesting}
                    className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isTesting ? "Teste..." : "Testen"}
                  </button>
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
                    disabled={isClearing}
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
          {testResult && (
            <div
              className={`mt-2 text-xs ${testResult.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {testResult.ok ? "Gültig" : (testResult.error ?? "Ungültig")}
            </div>
          )}
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
            disabled={!inputValue.trim() || isSaving}
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
