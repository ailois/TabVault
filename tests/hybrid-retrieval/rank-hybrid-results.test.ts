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

  it("matches the Yang Mi bookmark instead of generic Chinese question phrases", () => {
    const chineseDocs: SearchDocument[] = [
      {
        sourceType: "saved-bookmark",
        bookmarkId: "bm-yangmi",
        title: "\u6768\u5e42\u91c7\u8bbf\u5408\u96c6",
        url: "https://example.com/yangmi",
        summary: "",
        tagsText: "",
        bodyText: "",
        combinedText: "\u6768\u5e42\u91c7\u8bbf\u5408\u96c6",
        updatedAt: "2026-03-01T00:00:00.000Z"
      },
      {
        sourceType: "saved-bookmark",
        bookmarkId: "bm-about",
        title: "\u5173\u4e8e\u6211\u4eec - UniVibe",
        url: "https://example.com/about",
        summary: "",
        tagsText: "",
        bodyText: "",
        combinedText: "\u5173\u4e8e\u6211\u4eec - univibe",
        updatedAt: "2026-03-01T00:00:00.000Z"
      }
    ]

    const results = rankHybridResults(chineseDocs, "\u5173\u4e8e\u6768\u5e42\u7684\u4e66\u7b7e\u6709\u54ea\u4e9b\uff1f")

    expect(results).toHaveLength(1)
    expect(results[0].document.bookmarkId).toBe("bm-yangmi")
    expect(results[0].matchReason).toBe("title")
  })
})
