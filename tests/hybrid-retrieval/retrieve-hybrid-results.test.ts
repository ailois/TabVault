import { describe, expect, it, vi } from "vitest"
import { retrieveHybridResults } from "../../src/features/hybrid-retrieval/retrieve-hybrid-results"

const bookmarks = [
  {
    id: "bm-1",
    title: "React Compiler Notes",
    url: "https://example.com/react",
    summary: "About compiler",
    extractedText: "compiler removes memoization burden",
    aiTags: ["react"],
    userTags: [],
    status: "done",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z"
  }
]

describe("retrieveHybridResults", () => {
  it("returns current page and saved bookmarks in one ranked list", async () => {
    const listBookmarks = vi.fn(async () => bookmarks)

    const results = await retrieveHybridResults({
      query: "react compiler",
      currentPage: {
        title: "Current React Page",
        url: "https://example.com/current",
        extractedText: "react compiler and memoization"
      },
      listBookmarks
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.some((result: any) => result.document.sourceType === "current-page")).toBe(true)
    expect(results.some((result: any) => result.document.sourceType === "saved-bookmark")).toBe(true)
  })
})
