import { describe, expect, it, vi } from "vitest"

import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"

describe("saveCurrentPage", () => {
  it("creates a bookmark draft from a valid active tab and saves extracted text", async () => {
    const { saveCurrentPage } = await import("../../src/features/bookmarks/save-current-page")
    const bookmarkRepository = createBookmarkRepository()

    await saveCurrentPage({
      activeTab: {
        title: "Example page",
        url: "https://example.com/article"
      },
      extractedText: "  Extracted body text.  ",
      bookmarkRepository
    })

    expect(bookmarkRepository.save).toHaveBeenCalledTimes(1)

    const savedBookmark = vi.mocked(bookmarkRepository.save).mock.calls[0]?.[0]

    expect(savedBookmark).toMatchObject({
      title: "Example page",
      url: "https://example.com/article",
      extractedText: "Extracted body text.",
      status: "saved",
      aiTags: []
    })
  })

  it("omits extracted text when none is available", async () => {
    const { saveCurrentPage } = await import("../../src/features/bookmarks/save-current-page")
    const bookmarkRepository = createBookmarkRepository()

    await saveCurrentPage({
      activeTab: {
        title: "Example page",
        url: "https://example.com/article"
      },
      extractedText: "   ",
      bookmarkRepository
    })

    const savedBookmark = vi.mocked(bookmarkRepository.save).mock.calls[0]?.[0]

    expect(savedBookmark?.extractedText).toBeUndefined()
  })

  it("rejects an active tab without a usable url", async () => {
    const { saveCurrentPage } = await import("../../src/features/bookmarks/save-current-page")
    const bookmarkRepository = createBookmarkRepository()

    await expect(
      saveCurrentPage({
        activeTab: {
          title: "Broken page",
          url: "   "
        },
        bookmarkRepository
      })
    ).rejects.toThrow("Cannot save this page: missing URL.")

    expect(bookmarkRepository.save).not.toHaveBeenCalled()
  })

  it("rejects an active tab without a usable title", async () => {
    const { saveCurrentPage } = await import("../../src/features/bookmarks/save-current-page")
    const bookmarkRepository = createBookmarkRepository()

    await expect(
      saveCurrentPage({
        activeTab: {
          title: "   ",
          url: "https://example.com"
        },
        bookmarkRepository
      })
    ).rejects.toThrow("Cannot save this page: missing title.")

    expect(bookmarkRepository.save).not.toHaveBeenCalled()
  })
})

function createBookmarkRepository(): BookmarkRepository {
  return {
    save: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    clearAnalysis: vi.fn(async () => undefined),
    clearAllAnalysis: vi.fn(async () => undefined),
    clearErrorAnalysis: vi.fn(async () => undefined)
  }
}
