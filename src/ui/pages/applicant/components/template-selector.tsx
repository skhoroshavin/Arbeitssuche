import { Card } from "@/ui/components"
import type { ResumeTemplate } from "@/models/applicant"
import { ResumeClassicPreview } from "./templates/resume-classic-preview"
import { ResumeElegantPreview } from "./templates/resume-elegant-preview"
import { ResumeModernPreview } from "./templates/resume-modern-preview"
import { ResumeMinimalPreview } from "./templates/resume-minimal-preview"

export function TemplateSelector({
  onSelect,
  isPending,
}: {
  onSelect: (template: ResumeTemplate) => void
  isPending: boolean
}) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(
          [
            {
              value: "resume_classic" as const,
              label: "Klassisch",
              description: "Serif, zentriert, schlicht",
              preview: <ResumeClassicPreview />,
            },
            {
              value: "resume_elegant" as const,
              label: "Elegant",
              description: "Tabellarisch, Garamond",
              preview: <ResumeElegantPreview />,
            },
            {
              value: "resume_modern" as const,
              label: "Modern",
              description: "Seitenleiste, Akzentfarbe",
              preview: <ResumeModernPreview />,
            },
            {
              value: "resume_minimal" as const,
              label: "Minimal",
              description: "Kopfleiste, Farbverlauf",
              preview: <ResumeMinimalPreview />,
            },
          ] satisfies TemplateOption[]
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-label={`Lebenslauf-Vorlage ${opt.label}`}
            title={`${opt.label} - ${opt.description}`}
            disabled={isPending}
            onClick={() => onSelect(opt.value)}
            className="flex flex-col items-center rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-colors disabled:opacity-50"
          >
            <div className="w-full aspect-[210/297] rounded bg-white dark:bg-gray-100 shadow-sm overflow-hidden">
              {opt.preview}
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}

interface TemplateOption {
  value: ResumeTemplate
  label: string
  description: string
  preview: React.ReactNode
}
