import type { ReactNode } from "react"

export function WizardLayout({
  title,
  steps,
  onCancel,
  onBack,
  onNext,
  onFinish,
  finishDisabled = false,
  children,
}: WizardLayoutProperties) {
  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <StepSidebar title={title} steps={steps} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
        <NavigationFooter
          onCancel={onCancel}
          onBack={onBack}
          onNext={onNext}
          onFinish={onFinish}
          finishDisabled={finishDisabled}
        />
      </div>
    </div>
  )
}

function StepSidebar({ title, steps }: { title: string; steps: WizardStep[] }) {
  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-6 text-sm font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">
        {title}
      </p>
      <nav className="space-y-1">
        {steps.map((step) => (
          <StepItem key={step.id} step={step} />
        ))}
      </nav>
    </aside>
  )
}

function StepItem({ step }: { step: WizardStep }) {
  if (step.state === "done") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-green-600 dark:text-green-400">
        <span>✓</span>
        <span>{step.label}</span>
      </div>
    )
  }
  if (step.state === "current") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <span>●</span>
        <span>{step.label}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500">
      <span>·</span>
      <span>{step.label}</span>
    </div>
  )
}

function NavigationFooter({
  onCancel,
  onBack,
  onNext,
  onFinish,
  finishDisabled,
}: {
  onCancel: () => void
  onBack?: () => void
  onNext?: () => void
  onFinish?: () => Promise<void> | void
  finishDisabled: boolean
}) {
  return (
    <footer className="border-t border-gray-200 bg-white px-8 py-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          Abbrechen
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Zurück
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Weiter
          </button>
        )}
        {onFinish && (
          <button
            type="button"
            disabled={finishDisabled}
            onClick={() => {
              void onFinish()
            }}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            Fertigstellen
          </button>
        )}
      </div>
    </footer>
  )
}

export function buildWizardSteps<T extends string>(
  steps: readonly T[],
  labels: Record<T, string>,
  currentStep: T,
): WizardStep[] {
  const currentIndex = steps.indexOf(currentStep)
  return steps.map((s, index) => ({
    id: s,
    label: labels[s],
    state: toStepState(index, currentIndex),
  }))
}

function toStepState(index: number, currentIndex: number): WizardStep["state"] {
  if (index < currentIndex) return "done"
  if (index === currentIndex) return "current"
  return "pending"
}

interface WizardStep {
  id: string
  label: string
  state: "done" | "current" | "pending"
}

interface WizardLayoutProperties {
  title: string
  steps: WizardStep[]
  onCancel: () => void
  onBack?: () => void
  onNext?: () => void
  onFinish?: () => Promise<void> | void
  finishDisabled?: boolean
  children: ReactNode
}
