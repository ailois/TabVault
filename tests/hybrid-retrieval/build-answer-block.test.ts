import { describe, expect, it } from "vitest"
import { buildAnswerBlock } from "../../src/features/hybrid-retrieval/build-answer-block"

describe("buildAnswerBlock", () => {
  it("creates an answer with citations from ranked results", () => {
    const answer = buildAnswerBlock({
      query: "这篇文章对 useMemo 的结论是什么？",
      rankedResults: [
        {
          score: 120,
          matchReason: "current page",
          document: {
            sourceType: "current-page",
            title: "Current React Page",
            url: "https://example.com/current",
            summary: undefined,
            tagsText: "",
            bodyText: "React Compiler removes useMemo boilerplate.",
            combinedText: "",
            updatedAt: "2026-03-01T00:00:00.000Z"
          }
        }
      ]
    })

    expect(answer.text).toContain("Current React Page")
    expect(answer.citations).toHaveLength(1)
    expect(answer.citations[0].sourceType).toBe("current-page")
  })

  it("returns no-results text when results are empty", () => {
    const answer = buildAnswerBlock({ query: "no match query", rankedResults: [] })
    expect(answer.text).toContain("No local results found")
    expect(answer.citations).toHaveLength(0)
  })
})
