import { describe, expect, it } from "vitest"
import { buildBookmarkSearchDocument } from "../../src/features/hybrid-retrieval/search-documents"
import type { BookmarkRecord } from "../../src/types/bookmark"

const bookmark: BookmarkRecord = {
  id: "bm-1",
  title: "React Compiler Deep Dive",
  url: "https://react.dev/compiler",
  summary: "Compiler removes manual memoization burden",
  extractedText: "React Compiler can optimize components automatically",
  aiTags: ["react", "compiler"],
  userTags: ["memoization"],
  status: "done",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z"
}

describe("buildBookmarkSearchDocument", () => {
  it("builds weighted text fields from a bookmark", () => {
    const doc = buildBookmarkSearchDocument(bookmark)

    expect(doc.sourceType).toBe("saved-bookmark")
    expect(doc.bookmarkId).toBe("bm-1")
    expect(doc.tagsText).toContain("react")
    expect(doc.bodyText).toContain("optimize components")
    expect(doc.combinedText).toContain("Compiler removes manual memoization burden")
  })
})
