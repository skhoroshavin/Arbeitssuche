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

  useEffect(() => {
    if (
      isLoadingSetup({
        isLoading: setupState.isLoading,
        data: state,
        applicantsLoading: applicants.isLoading,
      })
    ) {
      return
    }

    if (state?.completed) {
      hasCompletedLegacySetup.current = false
      return
    }

    if (state === undefined) {
      if (applicants.data.length > 0) {
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
      return
    }

    hasCompletedLegacySetup.current = false

    const target = resolvePhaseRoute(state.lastPhase)
    if (location.pathname !== target) {
      void navigate(target, { replace: true })
    }
  }, [
    applicants.data.length,
    applicants.isLoading,
    completeSetup,
    location.pathname,
    navigate,
    state,
    setupState.isLoading,
  ])

  if (
    isLoadingSetup({
      isLoading: setupState.isLoading,
      data: state,
      applicantsLoading: applicants.isLoading,
    })
  ) {
    return <Loading />
  }

  if (state === undefined && applicants.data.length > 0) {
    return <Loading />
  }

  if (state && !state.completed) {
    return <Loading />
  }

  return <Outlet />
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
