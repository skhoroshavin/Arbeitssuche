import { useParams } from "react-router";
import {
  useJobSearchCoverLetter,
  useUpdateJobSearchCoverLetter,
  useGenerateCoverLetter,
} from "@/ui/data/job-searches";
import { useAutoSaveForm } from "@/ui/hooks/auto-save-form";
import {
  Card,
  PageHeader,
  Textarea,
  AutoSaveStatus,
  Loading,
} from "@/ui/components";

interface CoverLetterFormValues {
  content: string;
}

export default function JobSearchCoverLetter() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useJobSearchCoverLetter(id!);
  const update = useUpdateJobSearchCoverLetter(id!);
  const generate = useGenerateCoverLetter(id!);

  const { register, setValue, saveStatus } = useAutoSaveForm({
    queryResult: { data, isLoading },
    toFormValues: (d): CoverLetterFormValues => ({ content: d.content ?? "" }),
    onSave: async (form: CoverLetterFormValues) => {
      await update.mutateAsync(form.content);
    },
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Anschreiben-Vorlage"
        actions={
          <div className="flex items-center gap-2">
            <AutoSaveStatus status={saveStatus} />
            <button
              type="button"
              onClick={() => {
                generate.mutate(undefined, {
                  onSuccess: (result) => {
                    setValue("content", result.content, { shouldDirty: true });
                  },
                });
              }}
              disabled={generate.isPending}
              className="rounded-md bg-zinc-600 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50"
            >
              {generate.isPending ? "Generiere..." : "Generieren"}
            </button>
          </div>
        }
      />

      {generate.isError && (
        <p className="text-sm text-red-600">
          Generierung fehlgeschlagen. Bitte erneut versuchen.
        </p>
      )}

      <Card className="p-4">
        <Textarea label="Anschreiben" rows={20} {...register("content")} />
      </Card>
    </div>
  );
}
