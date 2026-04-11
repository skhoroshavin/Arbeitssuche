import { useAutoSaveForm } from "@/ui/hooks"
import { useAutoSaveHeader } from "@/ui/layout"
import { JobSearchCoverLetterView } from "@/ui/views"

export function CoverLetterEditor({
  coverLetterQuery,
  updateMutation,
  generateMutation,
  llmAvailable,
  rows = 12,
}: CoverLetterEditorProperties) {
  const { setValue, watch, saveStatus } = useAutoSaveForm<
    { content: string },
    { content: string }
  >({
    queryResult: coverLetterQuery,
    toFormValues: (d) => ({ content: d.content }),
    onSave: async (form) => {
      await updateMutation.mutateAsync(form.content)
    },
  })

  useAutoSaveHeader(saveStatus)

  return (
    <JobSearchCoverLetterView
      value={{ content: watch("content") }}
      onUpdate={(value) => {
        setValue("content", value.content, { shouldDirty: true })
      }}
      onGenerate={() => {
        generateMutation.mutate(undefined, {
          onSuccess: (result) => {
            setValue("content", result.content, { shouldDirty: true })
          },
        })
      }}
      isGenerating={generateMutation.isPending}
      isGenerateError={generateMutation.isError}
      llmAvailable={llmAvailable}
      rows={rows}
    />
  )
}

interface CoverLetterEditorProperties {
  coverLetterQuery: {
    data?: { content: string }
    isLoading: boolean
  }
  updateMutation: { mutateAsync: (content: string) => Promise<unknown> }
  generateMutation: GenerateMutation
  llmAvailable?: boolean
  rows?: number
}

interface GenerateMutation {
  mutate: (
    variables: undefined,
    options: { onSuccess: (data: { content: string }) => void },
  ) => void
  isPending: boolean
  isError: boolean
}
