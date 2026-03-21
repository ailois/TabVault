import type { TrialState } from "../../types/trial"

import { TRIAL_STORAGE_KEY } from "./trial-constants"

export class TrialRepository {
  async get(): Promise<TrialState | null> {
    const result = await chrome.storage.local.get(TRIAL_STORAGE_KEY)
    const state = result[TRIAL_STORAGE_KEY] as TrialState | undefined

    return state ?? null
  }

  async save(state: TrialState): Promise<void> {
    await chrome.storage.local.set({ [TRIAL_STORAGE_KEY]: state })
  }

  async incrementAnalysisUsed(): Promise<void> {
    const current = await this.get()

    if (!current) {
      return
    }

    await this.save({
      ...current,
      analysisUsed: current.analysisUsed + 1
    })
  }
}
