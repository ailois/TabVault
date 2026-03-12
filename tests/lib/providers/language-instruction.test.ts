import { describe, expect, it } from "vitest"
import { buildLanguageInstruction } from "../../../src/lib/providers/language-instruction"

describe("buildLanguageInstruction", () => {
  it("returns empty string for auto", () => {
    expect(buildLanguageInstruction("auto")).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(buildLanguageInstruction(undefined)).toBe("")
  })

  it("returns Chinese instruction for zh", () => {
    expect(buildLanguageInstruction("zh")).toBe(" Please respond in Chinese.")
  })

  it("returns English instruction for en", () => {
    expect(buildLanguageInstruction("en")).toBe(" Please respond in English.")
  })

  it("returns Japanese instruction for ja", () => {
    expect(buildLanguageInstruction("ja")).toBe(" Please respond in Japanese.")
  })
})
