import { useEffect, useRef, useState } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router"
import type { AppSetupState } from "@/models/setup"
import { Card, Loading, SectionHeader } from "@/ui/components"
import {
  closeApp,
  useCompleteSetupState,
  useSaveSetupState,
  useSetupState,
} from "@/ui/data"
import {
  FirstStartWizardContext,
  type FirstStartPhaseResult,
} from "@/ui/layout"

export function FirstStartWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const setupState = useSetupState()
  const state = setupState.data?.state
  const saveSetup = useSaveSetupState()
  const completeSetup = useCompleteSetupState()
  const [skipDraftResume, setSkipDraftResume] = useState(false)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || setupState.data === undefined) {
      return
    }

    initialized.current = true
    setShowResumePrompt(Boolean(state && hasSavedPhase(state)))
  }, [setupState.data, state])

  useEffect(() => {
    const target = resolveResumeTarget({
      pathname: location.pathname,
      showResumePrompt,
      setupState: state,
    })

    if (target && target !== location.pathname) {
      void navigate(target, { replace: true })
    }
  }, [location.pathname, navigate, showResumePrompt, state])

  if (isLoadingSetupState(setupState.isLoading, setupState.data)) {
    return <Loading />
  }

  if (state?.completed) {
    return <Navigate to="/" replace />
  }

  if (shouldShowResumePrompt(state, showResumePrompt)) {
    return (
      <ResumeSetupPrompt
        onResume={() => {
          setSkipDraftResume(true)
          setShowResumePrompt(false)
          void navigate(resolveSetupRoute(state), { replace: true })
        }}
        onSkip={async () => {
          await completeSetup.mutateAsync()
          void navigate("/", { replace: true })
        }}
      />
    )
  }

  return (
    <FirstStartWizardContext.Provider
      value={{
        isInFirstStart: true,
        onPhaseComplete: (result) => {
          void handlePhaseComplete({
            saveSetup,
            result,
            completeSetup,
            navigate,
          })
        },
        skipDraftResume,
      }}
    >
      <Outlet />
    </FirstStartWizardContext.Provider>
  )
}

export function DataClearedPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <Card className="w-full max-w-xl space-y-4 p-6">
        <SectionHeader>Alle Daten wurden gelöscht</SectionHeader>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Datenbank, Konfiguration und gespeicherte Schlüssel wurden entfernt.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void closeApp()
            }}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            App schließen
          </button>
          <button
            type="button"
            onClick={() => {
              void navigate("/first-start/settings", { replace: true })
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Konfiguration starten
          </button>
        </div>
      </Card>
    </div>
  )
}

function ResumeSetupPrompt({
  onResume,
  onSkip,
}: {
  onResume: () => void
  onSkip: () => Promise<void>
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <Card className="w-full max-w-xl space-y-4 p-6">
        <SectionHeader>Einrichtung fortsetzen?</SectionHeader>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Die Ersteinrichtung wurde beim letzten Mal nicht abgeschlossen. Sie
          können an der zuletzt offenen Stelle weitermachen oder die Einrichtung
          überspringen und direkt zur App wechseln.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onResume}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Einrichtung fortsetzen
          </button>
          <button
            type="button"
            onClick={() => {
              void onSkip()
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Einrichtung überspringen
          </button>
        </div>
      </Card>
    </div>
  )
}

function hasSavedPhase(state: AppSetupState): boolean {
  return state.lastPhase !== undefined
}

function isLoadingSetupState(
  isLoading: boolean,
  data: ReturnType<typeof useSetupState>["data"],
) {
  return isLoading || data === undefined
}

function shouldShowResumePrompt(
  state: AppSetupState | undefined,
  showResumePrompt: boolean,
) {
  return state !== undefined && showResumePrompt && hasSavedPhase(state)
}

function resolveResumeTarget({
  pathname,
  showResumePrompt,
  setupState,
}: {
  pathname: string
  showResumePrompt: boolean
  setupState: AppSetupState | undefined
}): string | undefined {
  if (
    setupState === undefined ||
    setupState.completed ||
    pathname !== "/first-start"
  ) {
    return undefined
  }

  return showResumePrompt ? "/first-start" : resolveSetupRoute(setupState)
}

async function handlePhaseComplete({
  saveSetup,
  result,
  completeSetup,
  navigate,
}: {
  saveSetup: ReturnType<typeof useSaveSetupState>
  result: FirstStartPhaseResult
  completeSetup: ReturnType<typeof useCompleteSetupState>
  navigate: ReturnType<typeof useNavigate>
}): Promise<void> {
  if (result.jobSearchId) {
    await completeSetup.mutateAsync()
    void navigate(`/job-searches/${result.jobSearchId}/vacancies`, {
      replace: true,
    })
    return
  }

  const nextState = resolveNextPhaseState(result)
  if (!nextState) {
    return
  }

  await saveSetup.mutateAsync(nextState)
  void navigate(resolveNextPhaseRoute(nextState), { replace: true })
}

function resolveNextPhaseState(result: FirstStartPhaseResult) {
  if (result.applicantId) {
    return {
      completed: false,
      lastPhase: "job-search",
      lastStep: result.nextStep,
      applicantId: result.applicantId,
    }
  }

  if (result.nextPhase === "applicant") {
    return {
      completed: false,
      lastPhase: "applicant",
      lastStep: result.nextStep,
      applicantId: undefined,
    }
  }

  return
}

function resolveNextPhaseRoute(state: Partial<AppSetupState>): string {
  if (state.lastPhase === "job-search" && state.applicantId) {
    return `/first-start/job-search/${state.applicantId}`
  }

  return "/first-start/applicant"
}

function resolveSetupRoute(state: AppSetupState): string {
  switch (state.lastPhase) {
    case "applicant": {
      return "/first-start/applicant"
    }
    case "job-search": {
      return state.applicantId
        ? `/first-start/job-search/${state.applicantId}`
        : "/first-start/applicant"
    }
    default: {
      return "/first-start/settings"
    }
  }
}
