// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { buildThemeFromOverride } from "../../src/ui/use-theme"

describe("buildThemeFromOverride", () => {
  it("returns light theme for 'light' override", () => {
    const theme = buildThemeFromOverride("light")
    expect(theme.isDark).toBe(false)
    expect(theme.page).toBeTruthy()
  })

  it("returns dark theme for 'dark' override", () => {
    const theme = buildThemeFromOverride("dark")
    expect(theme.isDark).toBe(true)
    expect(theme.page).toBeTruthy()
  })

  it("returns light theme when override is undefined and OS is light", () => {
    const theme = buildThemeFromOverride(undefined, false)
    expect(theme.isDark).toBe(false)
  })

  it("returns dark theme when override is undefined and OS is dark", () => {
    const theme = buildThemeFromOverride(undefined, true)
    expect(theme.isDark).toBe(true)
  })
})
