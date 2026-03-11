import { describe, expect, it } from "vitest"

import { colors, controls, radius, shadow, spacing, typography } from "../../src/ui/design-tokens"

describe("design tokens", () => {
  it("exports the core visual token groups", () => {
    expect(colors.page).toBeTruthy()
    expect(colors.surface).toBeTruthy()
    expect(colors.surfaceElevated).toBeTruthy()
    expect(colors.surfaceMuted).toBeTruthy()
    expect(colors.surfaceHover).toBeTruthy()
    expect(colors.border).toBeTruthy()
    expect(colors.textPrimary).toBeTruthy()
    expect(colors.textSecondary).toBeTruthy()
    expect(spacing.md).toBeTruthy()
    expect(spacing.sm).toBeTruthy()
    expect(spacing.lg).toBeTruthy()
    expect(radius.large).toBeTruthy()
    expect(radius.medium).toBeTruthy()
    expect(radius.pill).toBeTruthy()
    expect(shadow.soft).toBeTruthy()
    expect(typography.title.size).toBeTruthy()
    expect(typography.metadata.size).toBeTruthy()
    expect(typography.tag.size).toBeTruthy()
    expect(controls.primary.background).toBeTruthy()
    expect(controls.secondary.background).toBeTruthy()
    expect(controls.input.background).toBeTruthy()
    expect(controls.focusOutline).toBeTruthy()
  })

  it("uses a flat white canvas", () => {
    expect(colors.page).toBe("#ffffff")
    expect(colors.surface).toBe("#ffffff")
  })

  it("has a surfaceHover color for interactive list items", () => {
    expect(colors.surfaceHover).toBe("#f8fafc")
  })
})
