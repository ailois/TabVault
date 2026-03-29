import { describe, expect, it } from "vitest"
import { buildCurrentPageDocument } from "../../src/features/hybrid-retrieval/current-page-context"

describe("buildCurrentPageDocument", () => {
  it("returns null when page text is empty", () => {
    expect(buildCurrentPageDocument({ title: "Example", url: "https://example.com", extractedText: "" })).toBeNull()
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
