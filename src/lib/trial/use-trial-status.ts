import { useCallback, useEffect, useMemo, useState } from "react"
import type { TrialState, TrialStatus } from "../../types/trial"

import { getTrialStatus } from "./get-trial-status"
import { TrialRepository } from "./trial-repository"

export type UseTrialStatusResult = {
  status: TrialStatus | null
  state: TrialState | null
  reload: () => Promise<void>
}

export function useTrialStatus(): UseTrialStatusResult {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [state, setState] = useState<TrialState | null>(null)
  const repository = useMemo(() => new TrialRepository(), [])

  const loadTrialStatus = useCallback(async () => {
    try {
      let trialState = await repository.get()

      if (!trialState) {
        trialState = {
          installedAt: new Date().toISOString(),
          analysisUsed: 0
        }
        await repository.save(trialState)
      }

      setState(trialState)
      setStatus(getTrialStatus(trialState))
    } catch (error) {
      console.error("Failed to load trial status", error)
      setState(null)
      setStatus(null)
    }
  }, [repository])

  useEffect(() => {
    void loadTrialStatus()
  }, [loadTrialStatus])

  return { status, state, reload: loadTrialStatus }
}
