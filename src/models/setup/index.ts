export interface AppSetupState {
  completed: boolean
  lastPhase?: SetupPhase
  lastStep?: string
  applicantId?: string
}

export type SetupPhase = "settings" | "applicant" | "job-search"

export {
  createIncompleteSetupState,
  completeSetupState,
  mergeSetupState,
  resolveSetupState,
} from "./resolve.js"

export * from "./schemas.js"
