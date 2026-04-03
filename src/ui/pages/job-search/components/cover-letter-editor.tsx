import { useAutoSaveForm } from "@/ui/hooks";
import { Textarea } from "@/ui/components";
import { useAutoSaveHeader } from "@/ui/layout";
import { Link, useLocation } from "react-router";

export function CoverLetterEditor({
  coverLetterQuery,
  updateMutation,
  generateMutation,
  llmAvailable,
  rows = 12,
}: CoverLetterEditorProperties) {
  const location = useLocation();
  const { register, setValue, saveStatus } = useAutoSaveForm<
    { content: string },
    { content: string }
  >({
    queryResult: coverLetterQuery,
    toFormValues: (d) => ({ content: d.content }),
    onSave: async (form) => {
      await updateMutation.mutateAsync(form.content);
    },
  });

  useAutoSaveHeader(saveStatus);

  const generateDisabled = generateMutation.isPending || llmAvailable === false;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            generateMutation.mutate(undefined, {
              onSuccess: (result) => {
                setValue("content", result.content, { shouldDirty: true });
              },
            });
          }}
          disabled={generateDisabled}
          className="rounded-md bg-zinc-600 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50"
        >
          {generateMutation.isPending ? "Generiere..." : "Generieren"}
        </button>
      </div>

      {llmAvailable === false && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          KI-Schlüssel erforderlich.{" "}
          <Link
            to="/settings"
            state={{ returnTo: location.pathname }}
            className="underline hover:no-underline"
          >
            Zu den Einstellungen
          </Link>
        </p>
      )}

      {generateMutation.isError && (
        <p className="text-sm text-red-600">
          Generierung fehlgeschlagen. Bitte erneut versuchen.
        </p>
      )}

      <Textarea label="Anschreiben" rows={rows} {...register("content")} />
    </>
  );
}

interface CoverLetterEditorProperties {
  coverLetterQuery: {
    data?: { content: string };
    isLoading: boolean;
  };
  updateMutation: { mutateAsync: (content: string) => Promise<unknown> };
  generateMutation: GenerateMutation;
  llmAvailable?: boolean;
  rows?: number;
}

interface GenerateMutation {
  mutate: (
    variables: undefined,
    options: { onSuccess: (data: { content: string }) => void },
  ) => void;
  isPending: boolean;
  isError: boolean;
}
