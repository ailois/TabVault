import { describe, expect, it } from "vitest"

import { searchBookmarks } from "../../src/features/bookmarks/search-bookmarks"
import type { BookmarkRecord } from "../../src/types/bookmark"

describe("searchBookmarks", () => {
  it("returns bookmarks matching title, url, summary, or tags", () => {
    const reactBookmark = createBookmark({
      id: "bookmark-react",
      title: "React docs",
      url: "https://react.dev/learn",
      summary: "Learn the React component model",
      tags: ["frontend", "library"]
    })
    const cssBookmark = createBookmark({
      id: "bookmark-css",
      title: "CSS tricks",
      url: "https://css-tricks.com",
      summary: "Layout and animation patterns",
      tags: ["design"]
    })
    const apiBookmark = createBookmark({
      id: "bookmark-api",
      title: "Example API",
      url: "https://example.com/docs/graphql",
      summary: "Server query guide",
      tags: ["backend", "graphql"]
    })

    expect(searchBookmarks([reactBookmark, cssBookmark, apiBookmark], "react")).toEqual([reactBookmark])
    expect(searchBookmarks([reactBookmark, cssBookmark, apiBookmark], "css-tricks")).toEqual([cssBookmark])
    expect(searchBookmarks([reactBookmark, cssBookmark, apiBookmark], "query guide")).toEqual([apiBookmark])
    expect(searchBookmarks([reactBookmark, cssBookmark, apiBookmark], "FRONTEND")).toEqual([reactBookmark])
  })

  it("returns all bookmarks for an empty query", () => {
    const bookmarks = [
      createBookmark({ id: "bookmark-1", title: "First" }),
      createBookmark({ id: "bookmark-2", title: "Second" })
    ]

    expect(searchBookmarks(bookmarks, "")).toEqual(bookmarks)
    expect(searchBookmarks(bookmarks, "   ")).toEqual(bookmarks)
  })
})

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-default",
    url: "https://example.com",
    title: "Example",
    tags: [],
    status: "saved",
    createdAt: "2026-03-07T10:00:00.000Z",
    updatedAt: "2026-03-07T10:00:00.000Z",
    ...overrides
  }
}
