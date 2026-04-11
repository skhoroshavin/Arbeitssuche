import type { ReactNode } from "react"
import { PageHeader, Loading } from "@/ui/components"
import type { AutoSaveStatus } from "@/ui/hooks"
import { useAutoSaveHeader } from "@/ui/layout"

export function ApplicantFormPage({
  title,
  isLoading,
  saveStatus,
  useHeaderAutoSave = true,
  children,
}: {
  title: string
  isLoading: boolean
  saveStatus: AutoSaveStatus
  useHeaderAutoSave?: boolean
  children: ReactNode
}) {
  useAutoSaveHeader(saveStatus, useHeaderAutoSave)

  if (isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      {children}
    </div>
  )
}
