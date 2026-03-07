import { describe, expect, it } from "vitest"

import { DEFAULT_APP_SETTINGS } from "../../src/features/settings/default-settings"

describe("DEFAULT_APP_SETTINGS", () => {
  it("defaults to openai and disables auto analyze", () => {
    expect(DEFAULT_APP_SETTINGS.defaultProvider).toBe("openai")
    expect(DEFAULT_APP_SETTINGS.autoAnalyzeOnSave).toBe(false)
  })
})
