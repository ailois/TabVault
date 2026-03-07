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
      tags: []
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
    ).rejects.toThrow("Active tab URL is required")

    expect(bookmarkRepository.save).not.toHaveBeenCalled()
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
