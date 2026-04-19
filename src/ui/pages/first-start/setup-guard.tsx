import { useEffect, useRef } from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import { Loading } from "@/ui/components"
import {
  useApplicantListView,
  useCompleteSetupState,
  useSetupState,
} from "@/ui/data"

export function SetupGuard() {
  const navigate = useNavigate()
  const location = useLocation()
  const setupState = useSetupState()
  const state = setupState.data?.state
  const applicants = useApplicantListView()
  const completeSetup = useCompleteSetupState()
  const hasCompletedLegacySetup = useRef(false)
  const isLoading = isLoadingSetup({
    isLoading: setupState.isLoading,
    data: state,
    applicantsLoading: applicants.isLoading,
  })

  useEffect(() => {
    syncSetupNavigation({
      isLoading,
      state,
      applicantCount: applicants.data.length,
      hasCompletedLegacySetup,
      completeSetup,
      pathname: location.pathname,
      navigate,
    })
  }, [
    isLoading,
    applicants.data.length,
    completeSetup,
    location.pathname,
    navigate,
    state?.completed,
    state?.lastPhase,
  ])

  if (
    shouldRenderLoading({
      isLoading,
      state,
      applicantCount: applicants.data.length,
    })
  ) {
    return <Loading />
  }

  return <Outlet />
}

function syncSetupNavigation({
  isLoading,
  state,
  applicantCount,
  hasCompletedLegacySetup,
  completeSetup,
  pathname,
  navigate,
}: {
  isLoading: boolean
  state:
    | {
        completed: boolean
        lastPhase?: "settings" | "applicant" | "job-search"
      }
    | undefined
  applicantCount: number
  hasCompletedLegacySetup: { current: boolean }
  completeSetup: { mutateAsync: () => Promise<unknown> }
  pathname: string
  navigate: ReturnType<typeof useNavigate>
}) {
  if (isLoading) {
    return
  }

  if (state?.completed) {
    hasCompletedLegacySetup.current = false
    return
  }

  if (state === undefined) {
    handleMissingSetupState({
      applicantCount,
      hasCompletedLegacySetup,
      completeSetup,
      navigate,
    })
    return
  }

  hasCompletedLegacySetup.current = false
  const target = resolvePhaseRoute(state.lastPhase)
  if (pathname !== target) {
    void navigate(target, { replace: true })
  }
}

function handleMissingSetupState({
  applicantCount,
  hasCompletedLegacySetup,
  completeSetup,
  navigate,
}: {
  applicantCount: number
  hasCompletedLegacySetup: { current: boolean }
  completeSetup: { mutateAsync: () => Promise<unknown> }
  navigate: ReturnType<typeof useNavigate>
}) {
  if (applicantCount > 0) {
    if (hasCompletedLegacySetup.current) {
      return
    }

    hasCompletedLegacySetup.current = true
    void completeSetup.mutateAsync().catch(() => {
      hasCompletedLegacySetup.current = false
    })
    return
  }

  hasCompletedLegacySetup.current = false
  void navigate("/first-start/settings", { replace: true })
}

function shouldRenderLoading({
  isLoading,
  state,
  applicantCount,
}: {
  isLoading: boolean
  state: { completed: boolean } | undefined
  applicantCount: number
}) {
  if (isLoading) {
    return true
  }

  if (state === undefined && applicantCount > 0) {
    return true
  }

  return Boolean(state && !state.completed)
}

function isLoadingSetup({
  isLoading,
  data,
  applicantsLoading,
}: {
  isLoading: boolean
  data: { completed?: boolean } | undefined
  applicantsLoading: boolean
}) {
  return isLoading || (data === undefined && applicantsLoading)
}

function resolvePhaseRoute(
  lastPhase?: "settings" | "applicant" | "job-search",
) {
  if (lastPhase) {
    return "/first-start"
  }

  return "/first-start/settings"
}
