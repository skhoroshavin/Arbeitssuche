import { useParams } from "react-router"
import {
  useJobSearchCoverLetter,
  useUpdateJobSearchCoverLetter,
  useGenerateCoverLetter,
} from "@/ui/data"
import { useAutoSaveForm } from "@/ui/hooks"
import { useApiKeyStatus } from "@/ui/data"
import { Card, PageHeader, Loading } from "@/ui/components"
import { useAutoSaveHeader } from "@/ui/layout"
import { JobSearchCoverLetterView } from "@/ui/views"

export default function JobSearchCoverLetter() {
  const { id = "" } = useParams<{ id: string }>()
  const coverLetterQuery = useJobSearchCoverLetter(id)
  const update = useUpdateJobSearchCoverLetter(id)
  const generate = useGenerateCoverLetter(id)
  const { hasLlmKey } = useApiKeyStatus()
  const { setValue, watch, saveStatus } = useAutoSaveForm<
    { content: string },
    { content: string }
  >({
    queryResult: coverLetterQuery,
    toFormValues: (data) => ({ content: data.content }),
    onSave: async (form) => {
      await update.mutateAsync(form.content)
    },
  })

  useAutoSaveHeader(saveStatus)

  if (coverLetterQuery.isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <PageHeader title="Anschreiben-Vorlage" />

      <Card className="p-4 space-y-3">
        <JobSearchCoverLetterView
          value={{ content: watch("content") }}
          onUpdate={(value) => {
            setValue("content", value.content, { shouldDirty: true })
          }}
          onGenerate={() => {
            generate.mutate(undefined, {
              onSuccess: (result) => {
                setValue("content", result.content, { shouldDirty: true })
              },
            })
          }}
          isGenerating={generate.isPending}
          isGenerateError={generate.isError}
          llmAvailable={hasLlmKey}
          rows={20}
        />
      </Card>
    </div>
  )
}
