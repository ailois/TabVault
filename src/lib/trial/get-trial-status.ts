import type { TrialState, TrialStatus } from "../../types/trial"

import { TRIAL_ANALYSIS_LIMIT, TRIAL_DAYS } from "./trial-constants"

export function getTrialStatus(state: TrialState, now: number = Date.now()): TrialStatus {
  if (state.licenseKey && state.licenseStatus === "valid") {
    return "licensed"
  }

  const elapsed = now - new Date(state.installedAt).getTime()

  if (elapsed > TRIAL_DAYS) {
    return "expired"
  }

  if (state.analysisUsed >= TRIAL_ANALYSIS_LIMIT) {
    return "expired"
  }

  return "trial"
}
