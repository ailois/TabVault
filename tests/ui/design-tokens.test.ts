import { describe, expect, it } from "vitest"
import { buildGlobalStyles, lightTokens, darkTokens, radius, spacing } from "../../src/ui/design-tokens"

describe("lightTokens", () => {
  it("matches design prototype light theme values", () => {
    expect(lightTokens.page).toBe("#F4F6F9")
    expect(lightTokens.surface).toBe("#FFFFFF")
    expect(lightTokens.border).toBe("#DEE2E6")
    expect(lightTokens.accent).toBe("#5E6AD2")
    expect(lightTokens.accentHover).toBe("#4A55A2")
    expect(lightTokens.textPrimary).toBe("#212529")
    expect(lightTokens.textSecondary).toBe("#6C757D")
  })

  it("has accentHover field", () => {
    expect(lightTokens.accentHover).toBeDefined()
    expect(typeof lightTokens.accentHover).toBe("string")
  })
})

describe("darkTokens", () => {
  it("matches design prototype dark theme values", () => {
    expect(darkTokens.page).toBe("#1C1E23")
    expect(darkTokens.surface).toBe("#25282E")
    expect(darkTokens.border).toBe("#383C42")
    expect(darkTokens.accent).toBe("#7986CB")
    expect(darkTokens.accentHover).toBe("#5C6BC0")
    expect(darkTokens.textPrimary).toBe("#E1E1E1")
    expect(darkTokens.textSecondary).toBe("#8A8F98")
  })

  it("has accentHover field", () => {
    expect(darkTokens.accentHover).toBeDefined()
    expect(typeof darkTokens.accentHover).toBe("string")
  })
})

describe("radius", () => {
  it("has xl value for dashboard large cards", () => {
    expect(radius.xl).toBe("16px")
  })

  it("keeps medium at 8px and large at 12px", () => {
    expect(radius.medium).toBe("8px")
    expect(radius.large).toBe("12px")
  })
})

describe("global styles", () => {
  it("uses the prototype scrollbar widths and theme-derived focus rings", () => {
    const styles = buildGlobalStyles(lightTokens)

    expect(styles).toContain("width: 4px;")
    expect(styles).toContain("height: 4px;")
    expect(styles).toContain("background: #DEE2E6;")
    expect(styles).toContain("rgba(94,106,210,0.12)")
    expect(styles).toContain("rgba(94,106,210,0.16)")
  })
})
