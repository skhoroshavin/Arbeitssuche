import type { AppSetupState } from "."

export function mergeSetupState(
  current: Partial<AppSetupState> | undefined,
  update: Partial<AppSetupState>,
): AppSetupState {
  const base = resolveSetupState(current)

  return resolveSetupState({ ...base, ...update })
}

export function resolveSetupState(
  state?: Partial<AppSetupState>,
): AppSetupState {
  if (shouldBeCompleted(state)) {
    return completeSetupState()
  }

  return {
    completed: false,
    ...pickProgressFields(state),
  }
}

export function createIncompleteSetupState(): AppSetupState {
  return { completed: false }
}

export function completeSetupState(): AppSetupState {
  return { completed: true }
}

function shouldBeCompleted(state?: Partial<AppSetupState>): boolean {
  return state?.completed === true
}

function pickProgressFields(state?: Partial<AppSetupState>) {
  return {
    ...(state?.lastPhase ? { lastPhase: state.lastPhase } : {}),
    ...(state?.lastStep ? { lastStep: state.lastStep } : {}),
    ...(state?.applicantId ? { applicantId: state.applicantId } : {}),
  }
}
