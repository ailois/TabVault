import { describe, expect, it } from "vitest"

import { darkTokens, lightTokens, radius, shadow, spacing, typography } from "../../src/ui/design-tokens"

describe("design tokens", () => {
  it("exports lightTokens and darkTokens with required fields", () => {
    for (const tokens of [lightTokens, darkTokens]) {
      expect(tokens.page).toBeTruthy()
      expect(tokens.surface).toBeTruthy()
      expect(tokens.surfaceElevated).toBeTruthy()
      expect(tokens.surfaceHover).toBeTruthy()
      expect(tokens.border).toBeTruthy()
      expect(tokens.borderMuted).toBeTruthy()
      expect(tokens.borderFocus).toBeTruthy()
      expect(tokens.accent).toBeTruthy()
      expect(tokens.textPrimary).toBeTruthy()
      expect(tokens.textSecondary).toBeTruthy()
      expect(tokens.textMuted).toBeTruthy()
      expect(tokens.textSuccess).toBeTruthy()
      expect(tokens.textDanger).toBeTruthy()
    }
  })

  it("exports spacing, radius, typography, and shadow token groups", () => {
    expect(spacing.md).toBeTruthy()
    expect(spacing.sm).toBeTruthy()
    expect(spacing.lg).toBeTruthy()
    expect(radius.large).toBeTruthy()
    expect(radius.medium).toBeTruthy()
    expect(radius.pill).toBeTruthy()
    expect(shadow.soft).toBeTruthy()
    expect(shadow.dark).toBeTruthy()
    expect(shadow.light).toBeTruthy()
    expect(typography.title.size).toBeTruthy()
    expect(typography.metadata.size).toBeTruthy()
    expect(typography.tag.size).toBeTruthy()
  })

  it("light and dark tokens have distinct page colors", () => {
    expect(lightTokens.page).not.toBe(darkTokens.page)
  })

  it("borderFocus is defined in both themes for focus style injection", () => {
    expect(lightTokens.borderFocus).toBeTruthy()
    expect(darkTokens.borderFocus).toBeTruthy()
  })
})
