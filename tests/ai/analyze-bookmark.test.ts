import { describe, expect, it, vi } from "vitest"

import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"

describe("analyzeBookmark", () => {
  it("updates bookmark status before and after provider analysis", async () => {
    const { analyzeBookmark } = await import("../../src/features/ai/analyze-bookmark")
    const bookmarkRepository = createBookmarkRepository()
    const provider = {
      analyze: vi.fn(async () => ({
        summary: "Short summary",
        tags: ["example", "ai"]
      }))
    }
    const bookmark = createBookmark({
      extractedText: "  Example content for analysis.  ",
      updatedAt: "2026-03-07T10:00:00.000Z"
    })

    const result = await analyzeBookmark({
      bookmark,
      provider,
      bookmarkRepository
    })

    expect(bookmarkRepository.update).toHaveBeenCalledTimes(2)

    const firstUpdate = vi.mocked(bookmarkRepository.update).mock.calls[0]?.[0]
    const secondUpdate = vi.mocked(bookmarkRepository.update).mock.calls[1]?.[0]

    expect(firstUpdate).toMatchObject({
      id: bookmark.id,
      status: "analyzing",
      summary: undefined,
      tags: []
    })
    expect(provider.analyze).toHaveBeenCalledWith({
      title: bookmark.title,
      url: bookmark.url,
      content: "Example content for analysis."
    })
    expect(secondUpdate).toMatchObject({
      id: bookmark.id,
      status: "done",
      summary: "Short summary",
      tags: ["example", "ai"]
    })
    expect(result).toEqual(secondUpdate)
  })
})

function createBookmarkRepository(): BookmarkRepository {
  return {
    save: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    update: vi.fn(async () => undefined)
  }
}

function createBookmark(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: "bookmark-1",
    title: "Example",
    url: "https://example.com/article",
    extractedText: "Example content",
    tags: [],
    status: "saved",
    createdAt: "2026-03-07T09:59:00.000Z",
    updatedAt: "2026-03-07T09:59:00.000Z",
    ...overrides
  }
}
