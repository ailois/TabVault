import { describe, expect, it } from "vitest"

import { TRIAL_ANALYSIS_LIMIT, TRIAL_DAYS } from "../../../src/lib/trial/trial-constants"

describe("trial constants", () => {
  it("sets TRIAL_DAYS to 3 days in milliseconds", () => {
    expect(TRIAL_DAYS).toBe(3 * 24 * 60 * 60 * 1000)
  })

  it("sets TRIAL_ANALYSIS_LIMIT to 50", () => {
    expect(TRIAL_ANALYSIS_LIMIT).toBe(50)
  })
})
