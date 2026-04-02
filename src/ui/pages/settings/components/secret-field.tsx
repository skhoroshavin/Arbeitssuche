import { useState, useCallback } from "react";

export function SecretField({
  label,
  masked,
  isSet,
  onSave,
  onClear,
  onTest,
}: SecretFieldProperties) {
  const [mode, setMode] = useState<"display" | "editing">("display");
  const [inputValue, setInputValue] = useState("");
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
  }>();
  const [isSaving, setIsSaving] = useState(false);

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
    await onClear();
    setTestResult(undefined);
  };

  const handleTest = async () => {
    setTestResult(undefined);
    const result = await onTest();
    setTestResult(result);
  };

  return (
    <div>
      {mode === "display" ? (
        <SecretFieldDisplay
          label={label}
          masked={masked}
          isSet={isSet}
          onClear={handleClear}
          onTest={handleTest}
          onStartEditing={() => {
            setInputValue("");
            setMode("editing");
          }}
          testResult={testResult}
        />
      ) : (
        <SecretFieldEditor
          label={label}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

interface SecretFieldProperties {
  label: string;
  masked: string;
  isSet: boolean;
  onSave: (value: string) => Promise<void>;
  onClear: () => Promise<void>;
  onTest: () => Promise<{ ok: boolean; error?: string }>;
}

function SecretFieldDisplay({
  label,
  masked,
  isSet,
  onClear,
  onTest,
  onStartEditing,
  testResult,
}: {
  label: string;
  masked: string;
  isSet: boolean;
  onClear: () => void;
  onTest: () => void;
  onStartEditing: () => void;
  testResult: { ok: boolean; error?: string } | undefined;
}) {
  return (
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
                onClick={onTest}
                className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Testen
              </button>
              <button
                type="button"
                aria-label={`${label} ersetzen`}
                onClick={onStartEditing}
                className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Ersetzen
              </button>
              <button
                type="button"
                aria-label={`${label} löschen`}
                onClick={onClear}
                className="px-3 py-1 text-xs font-medium rounded border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Löschen
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label={`${label} hinzufügen`}
              onClick={onStartEditing}
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
  );
}

function SecretFieldEditor({
  label,
  inputValue,
  onInputChange,
  onSave,
  onCancel,
  isSaving,
}: {
  label: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        aria-label={label}
        value={inputValue}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        autoFocus
        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        aria-label={`${label} speichern`}
        onClick={onSave}
        disabled={!inputValue.trim() || isSaving}
        className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Speichern
      </button>
      <button
        type="button"
        aria-label={`${label} abbrechen`}
        onClick={onCancel}
        className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        Abbrechen
      </button>
    </div>
  );
}
