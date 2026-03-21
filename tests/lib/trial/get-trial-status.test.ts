import { describe, expect, it } from "vitest"

import { getTrialStatus } from "../../../src/lib/trial/get-trial-status"
import { TRIAL_ANALYSIS_LIMIT, TRIAL_DAYS } from "../../../src/lib/trial/trial-constants"
import type { TrialState } from "../../../src/types/trial"

const NOW = new Date("2026-03-19T12:00:00.000Z").getTime()

function buildState(overrides: Partial<TrialState> = {}): TrialState {
  return {
    installedAt: new Date(NOW).toISOString(),
    analysisUsed: 0,
    ...overrides
  }
}

describe("getTrialStatus", () => {
  it("returns trial when within trial period and below analysis limit", () => {
    const state = buildState({
      installedAt: new Date(NOW - 1_000).toISOString()
    })

    expect(getTrialStatus(state, NOW)).toBe("trial")
  })

  it("returns expired when installedAt is older than trial period", () => {
    const state = buildState({
      installedAt: new Date(NOW - TRIAL_DAYS - 1_000).toISOString()
    })

    expect(getTrialStatus(state, NOW)).toBe("expired")
  })

  it("returns expired when analysis limit is reached", () => {
    const state = buildState({
      analysisUsed: TRIAL_ANALYSIS_LIMIT
    })

    expect(getTrialStatus(state, NOW)).toBe("expired")
  })

  it("returns licensed when the license is valid", () => {
    const state = buildState({
      installedAt: new Date(NOW - TRIAL_DAYS - 999_999).toISOString(),
      analysisUsed: 999,
      licenseKey: "LSKEY-VALID",
      licenseStatus: "valid"
    })

    expect(getTrialStatus(state, NOW)).toBe("licensed")
  })

  it("returns expired when a license key exists but is not validated in an expired trial", () => {
    const state = buildState({
      installedAt: new Date(NOW - TRIAL_DAYS - 1_000).toISOString(),
      licenseKey: "LSKEY-PENDING",
      licenseStatus: "unvalidated"
    })

    expect(getTrialStatus(state, NOW)).toBe("expired")
  })
})
