import { describe, expect, it } from "vitest"
import { rankHybridResults } from "../../src/features/hybrid-retrieval/rank-hybrid-results"
import type { SearchDocument } from "../../src/features/hybrid-retrieval/search-documents"

const docs: SearchDocument[] = [
  {
    sourceType: "saved-bookmark",
    bookmarkId: "bm-title",
    title: "React Compiler Notes",
    url: "https://example.com/notes",
    summary: "",
    tagsText: "frontend",
    bodyText: "",
    combinedText: "react compiler notes frontend",
    updatedAt: "2026-03-01T00:00:00.000Z"
  },
  {
    sourceType: "saved-bookmark",
    bookmarkId: "bm-body",
    title: "Some page",
    url: "https://example.com/body",
    summary: "",
    tagsText: "",
    bodyText: "compiler details in body text",
    combinedText: "some page compiler details in body text",
    updatedAt: "2026-03-01T00:00:00.000Z"
  }
]

describe("rankHybridResults", () => {
  it("prefers title matches over body matches", () => {
    const results = rankHybridResults(docs, "react compiler")
    expect(results[0].document.bookmarkId).toBe("bm-title")
    expect(results[0].matchReason).toBe("title")
  })
})
