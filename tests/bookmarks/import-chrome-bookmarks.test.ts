import { describe, expect, it, vi } from "vitest"
import { importChromeBookmarks } from "../../src/features/bookmarks/import-chrome-bookmarks"
import type { BookmarkRepository } from "../../src/lib/storage/bookmark-repository"
import type { BookmarkRecord } from "../../src/types/bookmark"

describe("importChromeBookmarks", () => {
  it("flattens chrome bookmarks and saves them to repository", async () => {
    const mockTree = [{
      id: "root",
      title: "",
      children: [
        { id: "1", title: "Folder", children: [{ id: "2", title: "A", url: "https://a.com" }] },
        { id: "3", title: "B", url: "https://b.com" }
      ]
    }]

    const save = vi.fn<BookmarkRepository["save"]>(async () => {})
    const list = vi.fn<BookmarkRepository["list"]>(async () => [])
    const repo: BookmarkRepository = { save, list, getById: vi.fn(), update: vi.fn(), delete: vi.fn() }

    await importChromeBookmarks({
      getTree: async () => mockTree as any,
      bookmarkRepository: repo
    })

    expect(save).toHaveBeenCalledTimes(2)
    // Verify first call
    const savedA = save.mock.calls[0]?.[0] as BookmarkRecord
    expect(savedA.title).toBe("A")
    expect(savedA.url).toBe("https://a.com")
    expect(savedA.status).toBe("saved")
  })
})
