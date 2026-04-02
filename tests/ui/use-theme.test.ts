// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { buildThemeFromOverride } from "../../src/ui/use-theme"

describe("buildThemeFromOverride", () => {
  it("returns the sage theme by default", () => {
    const theme = buildThemeFromOverride(undefined)
    expect(theme.name).toBe("sage")
    expect(theme.isDark).toBe(false)
  })

  it("returns obsidian as a dark theme", () => {
    const theme = buildThemeFromOverride("obsidian")
    expect(theme.name).toBe("obsidian")
    expect(theme.isDark).toBe(true)
  })

  it("returns vanilla as a light theme", () => {
    const theme = buildThemeFromOverride("vanilla")
    expect(theme.name).toBe("vanilla")
    expect(theme.isDark).toBe(false)
  })

  it("falls back to sage for unknown or missing values", () => {
    expect(buildThemeFromOverride(undefined).name).toBe("sage")
  })
})
