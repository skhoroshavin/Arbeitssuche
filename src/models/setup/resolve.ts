import type { AppSetupState } from "."

export function mergeSetupState(
  current: Partial<AppSetupState> | undefined,
  update: Partial<AppSetupState>,
): AppSetupState {
  const base = resolveSetupState(current)

  return resolveSetupState({
    completed: "completed" in update ? update.completed : base.completed,
    lastPhase: "lastPhase" in update ? update.lastPhase : base.lastPhase,
    lastStep: "lastStep" in update ? update.lastStep : base.lastStep,
    applicantId:
      "applicantId" in update ? update.applicantId : base.applicantId,
  })
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
