import { useParams } from "react-router"
import {
  useJobSearchCoverLetter,
  useUpdateJobSearchCoverLetter,
  useGenerateCoverLetter,
} from "@/ui/data"
import { useApiKeyStatus } from "@/ui/data"
import { Card, PageHeader, Loading } from "@/ui/components"
import { CoverLetterEditor } from "@/ui/pages/job-search/components"

export default function JobSearchCoverLetter() {
  const { id = "" } = useParams<{ id: string }>()
  const coverLetterQuery = useJobSearchCoverLetter(id)
  const update = useUpdateJobSearchCoverLetter(id)
  const generate = useGenerateCoverLetter(id)
  const { hasLlmKey } = useApiKeyStatus()

  if (coverLetterQuery.isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <PageHeader title="Anschreiben-Vorlage" />

      <Card className="p-4 space-y-3">
        <CoverLetterEditor
          coverLetterQuery={coverLetterQuery}
          updateMutation={update}
          generateMutation={generate}
          llmAvailable={hasLlmKey}
          rows={20}
        />
      </Card>
    </div>
  )
}
