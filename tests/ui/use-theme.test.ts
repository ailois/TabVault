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

  it("builds a custom light theme from a stored accent color", () => {
    const theme = buildThemeFromOverride("custom" as any, "#C2587B")
    expect(theme.name).toBe("custom")
    expect(theme.isDark).toBe(false)
    expect(theme.accent).toBe("#C2587B")
    expect(theme.borderFocus).toBe("#C2587B")
  })

  it("uses taro purple as the fallback custom accent", () => {
    const theme = buildThemeFromOverride("custom" as any)
    expect(theme.name).toBe("custom")
    expect(theme.accent).toBe("#9D8CBA")
  })

  it("falls back to sage for unknown or missing values", () => {
    expect(buildThemeFromOverride(undefined).name).toBe("sage")
  })
})

