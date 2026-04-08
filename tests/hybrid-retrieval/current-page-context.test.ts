import { describe, expect, it } from "vitest"
import { buildCurrentPageDocument } from "../../src/features/hybrid-retrieval/current-page-context"

describe("buildCurrentPageDocument", () => {
  it("returns null when title or url is missing", () => {
    expect(buildCurrentPageDocument({ title: "Example", url: "", extractedText: "" })).toBeNull()
  })

  it("builds a current-page document even when page text is empty", () => {
    const doc = buildCurrentPageDocument({ title: "Example", url: "https://example.com", extractedText: "" })

    expect(doc?.sourceType).toBe("current-page")
    expect(doc?.title).toBe("Example")
    expect(doc?.bodyText).toBe("")
    expect(doc?.combinedText).toContain("example")
  })

  it("builds an ephemeral current-page document", () => {
    const doc = buildCurrentPageDocument({
      title: "Current React Article",
      url: "https://example.com/react",
      extractedText: "React 19 compiler removes useMemo boilerplate"
    })

    expect(doc?.sourceType).toBe("current-page")
    expect(doc?.title).toBe("Current React Article")
    expect(doc?.bodyText).toContain("useMemo")
  })
})
