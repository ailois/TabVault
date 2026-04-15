import { describe, expect, it } from "vitest"

import { searchBookmarksWithReasons } from "../../src/features/bookmarks/search-bookmarks"
import type { BookmarkRecord } from "../../src/types/bookmark"

function makeBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "1",
    url: "https://example.com",
    title: "Example Title",
    aiTags: [],
    userTags: [],
    status: "done",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides
  }
}

describe("searchBookmarksWithReasons", () => {
  it("matches title and returns reason containing 'title'", () => {
    const bookmark = makeBookmark({ title: "React performance tips" })
    const results = searchBookmarksWithReasons([bookmark], "react", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in title")
    expect(results[0].bookmark).toBe(bookmark)
  })

  it("matches summary and returns reason containing 'AI summary'", () => {
    const bookmark = makeBookmark({ summary: "This article is about caching strategies" })
    const results = searchBookmarksWithReasons([bookmark], "caching", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in summary")
  })

  it("matches aiTags and returns reason containing 'tag'", () => {
    const bookmark = makeBookmark({ aiTags: ["performance", "react"], title: "Some page" })
    const results = searchBookmarksWithReasons([bookmark], "performance", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in tags")
  })

  it("matches userTags and returns reason containing 'tag'", () => {
    const bookmark = makeBookmark({ userTags: ["my-custom-tag"] })
    const results = searchBookmarksWithReasons([bookmark], "custom", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in tags")
  })

  it("matches URL and returns reason containing 'URL'", () => {
    const bookmark = makeBookmark({ url: "https://graphql.org/learn" })
    const results = searchBookmarksWithReasons([bookmark], "graphql", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in URL")
  })

  it("matches extracted text and returns reason containing 'page content'", () => {
    const bookmark = makeBookmark({ extractedText: "Rust cancellation explained" })
    const results = searchBookmarksWithReasons([bookmark], "cancellation", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in page content")
  })

  it("returns localized match reasons for Chinese", () => {
    const bookmark = makeBookmark({ title: "React performance tips" })
    const results = searchBookmarksWithReasons([bookmark], "react", "zh")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("匹配标题")
  })

  it("returns empty array when no match", () => {
    const bookmark = makeBookmark({ title: "Vue.js guide" })
    const results = searchBookmarksWithReasons([bookmark], "react", "en")

    expect(results).toHaveLength(0)
  })

  it("returns empty array for empty query", () => {
    const bookmark = makeBookmark({ title: "React docs" })
    const results = searchBookmarksWithReasons([bookmark], "", "en")

    expect(results).toHaveLength(0)
  })

  it("is case insensitive", () => {
    const bookmark = makeBookmark({ title: "React performance tips" })
    const results = searchBookmarksWithReasons([bookmark], "REACT", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in title")
  })

  it("prioritises title over summary when both match", () => {
    const bookmark = makeBookmark({
      title: "Caching React components",
      summary: "Caching in detail"
    })
    const results = searchBookmarksWithReasons([bookmark], "caching", "en")

    expect(results).toHaveLength(1)
    expect(results[0].matchReason).toContain("Matches in title")
  })
})
